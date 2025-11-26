import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaGoogle } from 'react-icons/fa';
import { IconEye, IconEyeOff, IconX } from '@tabler/icons-react';
import { logger } from '@repo/shared/logger';

import { useAuth, useAuthActions } from '@repo/common/context';
import { Button, Input } from '@repo/ui';

type CustomSignUpProps = {
    redirectUrl?: string;
    onClose?: () => void;
};

export const CustomSignUp = ({
    redirectUrl = '/sign-in/sso-callback',
    onClose,
}: CustomSignUpProps) => {
    const router = useRouter();
    const { isLoaded, isSignedIn } = useAuth();
    const {
        signUpWithPassword,
        verifyEmailCode,
        requestEmailCode,
        signInWithGoogle,
    } = useAuthActions();

    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

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

    const validateForm = () => {
        if (!formData.firstName.trim()) {
            setError('First name is required');
            return false;
        }
        if (!formData.lastName.trim()) {
            setError('Last name is required');
            return false;
        }
        if (!formData.email.trim()) {
            setError('Email is required');
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setError('Please enter a valid email address');
            return false;
        }
        if (!formData.password) {
            setError('Password is required');
            return false;
        }
        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return false;
        }
        return true;
    };

    const handleSignUp = async () => {
        resetErrors();

        if (!validateForm()) {
            return;
        }

        setIsLoading('signup');

        try {
            const token = await signUpWithPassword({
                email: formData.email.trim(),
                password: formData.password,
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
            });

            setEmailToken(token);
            setVerifying(true);
        } catch (err: unknown) {
            logger.error('Sign-up error', err as Error);
            const message = err instanceof Error ? err.message : 'Sign-up failed. Please try again.';
            setError(message);
        } finally {
            setIsLoading(null);
        }
    };

    const handleVerify = async () => {
        resetErrors();

        if (!emailToken) {
            setError('Sign-up session has expired. Please start again.');
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
            logger.error('Verification error', err as Error);
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

    const handleResendCode = async () => {
        if (resending || !emailToken) {
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
            <div className="flex w-[350px] flex-col items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                    <h2 className="font-clash text-foreground !text-brand text-center text-[24px] font-semibold leading-tight">
                        Verify your email
                    </h2>
                    <p className="text-muted-foreground text-center text-sm">
                        We've sent a verification code to{' '}
                        <span className="font-medium">{emailToken?.email}</span>. Enter the code to complete
                        your registration.
                    </p>
                </div>
                <div className="flex flex-col gap-3 w-full">
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
                        onClick={handleResendCode}
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
            <div className="flex w-[350px] flex-col items-center gap-6">
                <h2 className="text-muted-foreground/70 text-center text-[24px] font-semibold leading-tight">
                    Create your account
                </h2>

                <div className="flex w-full flex-col space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            placeholder="First name"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            disabled={isLoading !== null}
                        />
                        <Input
                            placeholder="Last name"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            disabled={isLoading !== null}
                        />
                    </div>

                    <Input
                        type="email"
                        placeholder="Email address"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        disabled={isLoading !== null}
                    />

                    <div className="relative">
                        <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password (min. 8 characters)"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

                    <Button
                        onClick={handleSignUp}
                        disabled={isLoading === 'signup'}
                        className="w-full"
                    >
                        {isLoading === 'signup' ? (
                            <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Creating account...
                            </>
                        ) : (
                            'Create account'
                        )}
                    </Button>

                    {error && <div className="text-center text-sm text-rose-400">{error}</div>}
                </div>

                <div className="flex w-full items-center gap-4">
                    <div className="bg-border h-px flex-1" />
                    <span className="text-muted-foreground text-sm">or continue with</span>
                    <div className="bg-border h-px flex-1" />
                </div>

                <div className="flex w-full flex-col space-y-2">
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

                <div className="text-center">
                    <p className="text-muted-foreground text-sm">
                        Already have an account?{' '}
                        <a href="/sign-in" className="hover:text-brand text-brand underline">
                            Sign in
                        </a>
                    </p>
                </div>

                <div className="text-muted-foreground/50 w-full text-center text-xs">
                    <span className="text-muted-foreground/50">
                        By creating an account, you agree to the{' '}
                    </span>
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