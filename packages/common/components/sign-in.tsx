import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaGoogle } from 'react-icons/fa';
import { IconEye, IconEyeOff, IconX } from '@tabler/icons-react';
import { logger } from '@repo/shared/logger';

import { useAuth, useAuthActions } from '@repo/common/context';
import { Button, Input } from '@repo/ui';

type CustomSignInProps = {
    redirectUrl?: string;
    onClose?: () => void;
};

export const CustomSignIn = ({
    redirectUrl = '/sign-in/sso-callback',
    onClose,
}: CustomSignInProps) => {
    const router = useRouter();

    const { isLoaded, isSignedIn } = useAuth();
    const {
        signInWithPassword,
        requestEmailCode,
        verifyEmailCode,
        signInWithGoogle,
    } = useAuthActions();

    const [authMode, setAuthMode] = useState<'password' | 'emailCode'>('password');
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const [verifying, setVerifying] = useState(false);
    const [emailToken, setEmailToken] = useState<{ userId: string; email: string } | null>(null);
    const [code, setCode] = useState('');
    const [resending, setResending] = useState(false);

    if (!isLoaded) {
        return null;
    }

    if (isSignedIn) {
        router.push('/chat');
        return null;
    }

    const resetErrors = () => setError('');

    const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    const handlePasswordAuth = async () => {
        setIsLoading('password');
        resetErrors();

        if (!email) {
            setError('Email is required');
            setIsLoading(null);
            return;
        }

        if (!validateEmail(email)) {
            setError('Please enter a valid email');
            setIsLoading(null);
            return;
        }

        if (!password) {
            setError('Password is required');
            setIsLoading(null);
            return;
        }

        try {
            await signInWithPassword(email.trim(), password);
            router.push('/chat');
        } catch (err: unknown) {
            logger.error('Password authentication error', err as Error);
            const message = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
            if (message.toLowerCase().includes('invalid credentials')) {
                setError('Invalid email or password. Please try again.');
            } else if (message.toLowerCase().includes('not found')) {
                setError('Account not found. Please check your email or sign up.');
            } else {
                setError(message);
            }
        } finally {
            setIsLoading(null);
        }
    };

    const handleEmailAuth = async () => {
        setIsLoading('email');
        resetErrors();

        if (!email) {
            setError('Email is required');
            setIsLoading(null);
            return;
        }

        if (!validateEmail(email)) {
            setError('Please enter a valid email');
            setIsLoading(null);
            return;
        }

        try {
            const token = await requestEmailCode(email.trim());
            setEmailToken(token);
            setVerifying(true);
        } catch (err: unknown) {
            logger.error('Email authentication error', err as Error);
            const message = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
            setError(message);
        } finally {
            setIsLoading(null);
        }
    };

    const handleVerify = async () => {
        resetErrors();

        if (!emailToken) {
            setError('Email verification has not been requested.');
            return;
        }

        if (code.length !== 6) {
            setError('Please enter the complete 6-digit code');
            return;
        }

        setIsLoading('verify');

        try {
            await verifyEmailCode(emailToken.userId, code);
            router.push('/chat');
        } catch (err: unknown) {
            logger.error('Verification failed', err as Error);
            const message = err instanceof Error ? err.message : 'Verification failed. Please try again.';
            if (message.toLowerCase().includes('code')) {
                setError('Invalid verification code. Please try again.');
            } else {
                setError(message);
            }
        } finally {
            setIsLoading(null);
        }
    };

    const handleSendCode = async () => {
        if (resending || !emailToken) {
            setError('Email is missing. Please try again.');
            return;
        }

        setResending(true);
        resetErrors();

        try {
            const token = await requestEmailCode(emailToken.email);
            setEmailToken(token);
        } catch (err: unknown) {
            logger.error('Error resending code', err as Error);
            setError('Failed to resend code. Please try again.');
        } finally {
            setTimeout(() => setResending(false), 3000);
        }
    };

    const handleGoogleAuth = async () => {
        setIsLoading('google');
        resetErrors();

        try {
            await signInWithGoogle(redirectUrl);
        } catch (error) {
            logger.error('Google authentication error', error as Error);
            setError('Google authentication failed. Please try again.');
        } finally {
            setIsLoading(null);
        }
    };

    if (verifying) {
        return (
            <div className="flex w-full max-w-[300px] flex-col items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                    <h2 className="font-clash text-foreground !text-brand text-center text-[24px] font-semibold leading-tight">
                        Check your email
                    </h2>
                    <p className="text-muted-foreground text-center text-sm">
                        We've sent a code to{' '}
                        <span className="font-medium">{emailToken?.email}</span>. Please check your inbox and
                        enter the code to continue.
                    </p>
                </div>
                <div className="flex w-full flex-col gap-3">
                    <Input
                        maxLength={6}
                        autoFocus
                        value={code}
                        onChange={(e) => {
                            setCode(e.target.value);
                            resetErrors();
                        }}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && code.length === 6) {
                                handleVerify();
                            }
                        }}
                        placeholder="Enter 6-digit code"
                        className="text-center text-lg tracking-widest"
                        disabled={isLoading === 'verify'}
                    />
                    <Button
                        onClick={handleVerify}
                        disabled={code.length !== 6 || isLoading === 'verify'}
                        className="w-full"
                    >
                        {isLoading === 'verify' ? (
                            <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Verifying...
                            </>
                        ) : (
                            'Verify Code'
                        )}
                    </Button>
                </div>
                <p className="text-muted-foreground text-center text-sm">
                    Didn't receive an email?{' '}
                    <span
                        className={`hover:text-brand text-brand cursor-pointer underline ${
                            resending ? 'pointer-events-none opacity-70' : ''
                        }`}
                        onClick={handleSendCode}
                    >
                        {resending ? 'Sending...' : 'Resend Code'}
                    </span>
                </p>
                <div className="text-muted-foreground text-center text-sm">
                    {error && <p className="text-rose-400">{error}</p>}
                    {resending && <p className="text-brand">Sending verification code...</p>}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                        setVerifying(false);
                        setCode('');
                    }}
                >
                    Back
                </Button>
            </div>
        );
    }

    return (
        <>
            <Button
                onClick={() => {
                    onClose?.();
                }}
                variant="ghost"
                size="icon-sm"
                className="absolute right-2 top-2"
            >
                <IconX className="h-4 w-4" />
            </Button>
            <div className="flex w-full max-w-[350px] flex-col items-center gap-6">
                <h2 className="text-muted-foreground/70 text-center text-[24px] font-semibold leading-tight">
                    Sign in to unlock <br /> advanced research tools
                </h2>

                <div className="flex w-full flex-col space-y-4">
                    <div className="flex flex-col space-y-3">
                        <Input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading !== null}
                        />

                        {authMode === 'password' && (
                            <div className="relative">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading !== null}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="absolute right-2 top-1/2 -translate-y-1/2"
                                    onClick={() => setShowPassword((value) => !value)}
                                >
                                    {showPassword ? (
                                        <IconEyeOff className="h-4 w-4" />
                                    ) : (
                                        <IconEye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        )}

                        <Button
                            onClick={authMode === 'password' ? handlePasswordAuth : handleEmailAuth}
                            disabled={isLoading === 'password' || isLoading === 'email'}
                            className="w-full"
                        >
                            {isLoading === 'password' || isLoading === 'email' ? (
                                <>
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Signing in...
                                </>
                            ) : (
                                `Sign in ${authMode === 'password' ? 'with password' : 'with email code'}`
                            )}
                        </Button>

                        {error && <div className="text-center text-sm text-rose-400">{error}</div>}

                        <div className="text-center">
                            <span
                                className="hover:text-brand text-brand cursor-pointer text-sm underline"
                                onClick={() => {
                                    setAuthMode((mode) => (mode === 'password' ? 'emailCode' : 'password'));
                                    resetErrors();
                                    setPassword('');
                                }}
                            >
                                {authMode === 'password'
                                    ? 'Use email verification code instead'
                                    : 'Use password instead'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-border h-px flex-1" />
                        <span className="text-muted-foreground text-sm">or continue with</span>
                        <div className="bg-border h-px flex-1" />
                    </div>

                    <div className="flex flex-col space-y-2">
                        <Button
                            onClick={handleGoogleAuth}
                            disabled={isLoading === 'google'}
                            variant="bordered"
                        >
                            {isLoading === 'google' ? (
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <FaGoogle className="size-3" />
                            )}
                            {isLoading === 'google' ? 'Authenticating...' : 'Continue with Google'}
                        </Button>
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-muted-foreground text-sm">
                        Don't have an account?{' '}
                        <a href="/sign-up" className="hover:text-brand text-brand underline">
                            Sign up
                        </a>
                    </p>
                </div>

                <div className="text-muted-foreground/50 w-full text-center text-xs">
                    <span className="text-muted-foreground/50">By using this app, you agree to the </span>
                    <a href="/terms" className="hover:text-foreground underline">
                        Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="hover:text-foreground underline">
                        Privacy Policy
                    </a>
                </div>
                <Button variant="ghost" size="sm" className="w-full" onClick={onClose}>
                    Close
                </Button>
            </div>
        </>
    );
};
