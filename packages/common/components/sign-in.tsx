import { useSignIn, useSignUp } from '@clerk/nextjs';
import { isClerkAPIResponseError } from '@clerk/nextjs/errors';
import { Button, Input } from '@repo/ui';
import { IconX, IconEye, IconEyeOff } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FaGithub, FaGoogle } from 'react-icons/fa';
type CustomSignInProps = {
    redirectUrl?: string;
    onClose?: () => void;
};

export const CustomSignIn = ({
    redirectUrl = '/sign-in/sso-callback',
    onClose,
}: CustomSignInProps) => {
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [verifying, setVerifying] = useState(false);
    const { signIn, isLoaded, setActive } = useSignIn();
    const { signUp, isLoaded: isSignUpLoaded } = useSignUp();
    const [code, setCode] = useState('');
    const [resending, setResending] = useState(false);
    const [authMode, setAuthMode] = useState<'password' | 'emailCode'>('password');
    if (!isSignUpLoaded || !isLoaded) return null;
    const router = useRouter();

    const handleVerify = async () => {
        // Check if code is complete
        if (code.length !== 6) {
            setError('Please enter the complete 6-digit code');
            return;
        }

        setIsLoading('verify');
        setError(''); // Clear any previous errors
        
        try {
            if (!isLoaded || !signIn) return;
            
            // First try sign-up verification
            const result = await signUp.attemptEmailAddressVerification({
                code,
            });

            if (result.status === 'complete') {
                setActive({ session: result.createdSessionId });
                router.push('/chat');
            }
        } catch (error: any) {
            console.log('Sign-up verification failed, trying sign-in:', error.errors);
            
            // If sign-up fails, try sign-in verification
            if (error.errors && error.errors.some((e: any) => e.code === 'client_state_invalid')) {
                try {
                    const result = await signIn.attemptFirstFactor({
                        strategy: 'email_code',
                        code,
                    });

                    if (result.status === 'complete') {
                        setActive({ session: result.createdSessionId });
                        router.push('/chat');
                    }
                } catch (signInError: any) {
                    console.error('Sign-in verification error:', signInError);
                    if (isClerkAPIResponseError(signInError)) {
                        const errorMessage = signInError.errors[0]?.longMessage || signInError.errors[0]?.message;
                        if (errorMessage?.includes('code')) {
                            setError('Invalid verification code. Please try again.');
                        } else {
                            setError(errorMessage || 'Verification failed. Please try again.');
                        }
                    } else {
                        setError('Something went wrong while verifying. Please try again.');
                    }
                }
            } else {
                // Handle sign-up verification errors
                if (isClerkAPIResponseError(error)) {
                    const errorMessage = error.errors[0]?.longMessage || error.errors[0]?.message;
                    if (errorMessage?.includes('code')) {
                        setError('Invalid verification code. Please try again.');
                    } else {
                        setError(errorMessage || 'Verification failed. Please try again.');
                    }
                } else {
                    setError('Verification failed. Please try again.');
                }
            }
        } finally {
            setIsLoading(null);
        }
    };

    const handleGoogleAuth = async () => {
        setIsLoading('google');

        try {
            if (!isLoaded || !signIn) return;
            await signIn.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl,
                redirectUrlComplete: redirectUrl,
            });
        } catch (error) {
            console.error('Google authentication error:', error);
        } finally {
            setIsLoading(null);
        }
    };

    const handleGithubAuth = async () => {
        setIsLoading('github');

        try {
            if (!isLoaded || !signIn) return;
            await signIn.authenticateWithRedirect({
                strategy: 'oauth_github',
                redirectUrl,
                redirectUrlComplete: redirectUrl,
            });
        } catch (error) {
            console.error('GitHub authentication error:', error);
        } finally {
            setIsLoading(null);
        }
    };

    const handleAppleAuth = async () => {
        setIsLoading('apple');

        try {
            if (!isLoaded || !signIn) return;
            await signIn.authenticateWithRedirect({
                strategy: 'oauth_apple',
                redirectUrl,
                redirectUrlComplete: redirectUrl,
            });
        } catch (error) {
            console.error('Apple authentication error:', error);
        } finally {
            setIsLoading(null);
        }
    };

    const validateEmail = (email: string) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    const handlePasswordAuth = async () => {
        setIsLoading('password');
        setError('');

        if (!email) {
            setError('Email is required');
            setIsLoading(null);
            return;
        } else if (!validateEmail(email)) {
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
            if (!signIn) return;

            const result = await signIn.create({
                identifier: email,
                password: password,
            });

            if (result.status === 'complete') {
                setActive({ session: result.createdSessionId });
                router.push('/chat');
            } else {
                // Handle additional factors if needed
                console.log('Additional factors required:', result);
                setError('Additional authentication required. Please check your account settings.');
            }
        } catch (error: any) {
            console.error('Password authentication error:', error);
            if (isClerkAPIResponseError(error)) {
                const errorMessage = error.errors[0]?.longMessage || error.errors[0]?.message;
                if (errorMessage?.includes('password')) {
                    setError('Invalid email or password. Please try again.');
                } else if (errorMessage?.includes('identifier')) {
                    setError('Account not found. Please check your email or sign up.');
                } else {
                    setError(errorMessage || 'Authentication failed. Please try again.');
                }
            } else {
                setError('Something went wrong. Please try again.');
            }
        } finally {
            setIsLoading(null);
        }
    };

    const handleEmailAuth = async () => {
        setIsLoading('email');
        setError('');

        if (!email) {
            setError('Email is required');
            setIsLoading(null);
            return;
        } else if (!validateEmail(email)) {
            setError('Please enter a valid email');
            setIsLoading(null);
            return;
        }

        try {
            // Try signing up the user first
            await signUp.create({ emailAddress: email });

            // If sign-up is successful, send the magic link
            const protocol = window.location.protocol;
            const host = window.location.host;
            const fullRedirectUrl = `${protocol}//${host}${redirectUrl}`;

            await signUp.prepareEmailAddressVerification({
                strategy: 'email_code',
            });

            setVerifying(true);
        } catch (error: any) {
            if (
                error.errors &&
                error.errors.some((e: any) => e.code === 'form_identifier_exists')
            ) {
                try {
                    // If the user already exists, sign them in instead
                    const signInAttempt = await signIn.create({
                        identifier: email,
                    });

                    console.log(signInAttempt);

                    // Get the email address ID from the response and prepare the magic link
                    const emailAddressIdObj: any = signInAttempt?.supportedFirstFactors?.find(
                        (factor: any) => factor.strategy === 'email_code'
                    );

                    const emailAddressId: any = emailAddressIdObj?.emailAddressId || '';

                    if (emailAddressId) {
                        await signIn.prepareFirstFactor({
                            strategy: 'email_code',
                            emailAddressId,
                        });

                        setVerifying(true);
                    } else {
                        throw new Error('Email address ID not found');
                    }
                } catch (error: any) {
                    console.log(error.message);
                    if (error.includes('Incorrect code')) {
                        setError('Incorrect code. Please try again.');
                    } else {
                        console.error('Sign-in error:', error);
                        setError('Something went wrong while signing in. Please try again.');
                    }
                }
            } else {
                console.error('Authentication error:', error);
                setError(
                    error?.errors?.[0]?.longMessage || 'Authentication failed. Please try again.'
                );
            }
        } finally {
            setIsLoading(null);
        }
    };

    const handleSendCode = async () => {
        // Don't proceed if already resending
        if (resending) return;

        // Check if email is available
        if (!email) {
            setError('Email is missing. Please try again.');
            return;
        }

        setResending(true);
        setError('');

        try {
            // First try with signUp flow
            await signUp.prepareEmailAddressVerification({
                strategy: 'email_code',
            });

            // Show a success message
            setError('');
        } catch (error: any) {
            // If error, try with signIn flow
            if (error.errors && error.errors.some((e: any) => e.code === 'client_state_invalid')) {
                try {
                    const signInAttempt = await signIn.create({
                        identifier: email,
                    });

                    const emailAddressIdObj: any = signInAttempt?.supportedFirstFactors?.find(
                        (factor: any) => factor.strategy === 'email_code'
                    );

                    const emailAddressId: any = emailAddressIdObj?.emailAddressId || '';

                    if (emailAddressId) {
                        await signIn.prepareFirstFactor({
                            strategy: 'email_code',
                            emailAddressId,
                        });
                    } else {
                        throw new Error('Email address ID not found');
                    }
                } catch (error) {
                    if (isClerkAPIResponseError(error)) {
                        console.error('Error resending code:', error);
                    }
                    setError('Failed to resend code. Please try again.');
                }
            } else {
                console.error('Error resending code:', error);
                setError('Failed to resend code. Please try again.');
            }
        } finally {
            // Wait a moment before allowing another resend (to prevent spam)
            setTimeout(() => {
                setResending(false);
            }, 3000);
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
                        We've sent a code to your email. Please check your inbox and enter the code
                        to continue.
                    </p>
                </div>
                <div className="flex flex-col gap-3 w-full">
                    <Input
                        maxLength={6}
                        autoFocus
                        value={code}
                        onChange={(e) => {
                            setCode(e.target.value);
                            setError(''); // Clear error when typing
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
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
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

                <div id="clerk-captcha"></div>
                <div className="text-muted-foreground text-center text-sm">
                    {error && <p className="text-rose-400">{error}</p>}
                    {resending && <p className="text-brand">Sending verification code...</p>}
                </div>
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
                    {/* Email/Password Form */}
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
                                    onClick={() => setShowPassword(!showPassword)}
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
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    Signing in...
                                </>
                            ) : (
                                `Sign in ${authMode === 'password' ? 'with password' : 'with email code'}`
                            )}
                        </Button>

                        {error && (
                            <div className="text-center text-sm text-rose-400">
                                {error}
                            </div>
                        )}

                        <div className="text-center">
                            <span
                                className="hover:text-brand text-brand cursor-pointer text-sm underline"
                                onClick={() => {
                                    setAuthMode(authMode === 'password' ? 'emailCode' : 'password');
                                    setError('');
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
                        <div className="bg-border h-px flex-1"></div>
                        <span className="text-muted-foreground text-sm">or continue with</span>
                        <div className="bg-border h-px flex-1"></div>
                    </div>

                    <div className="flex flex-col space-y-2">
                        <Button
                            onClick={handleGoogleAuth}
                            disabled={isLoading === 'google'}
                            variant="bordered"
                        >
                            {isLoading === 'google' ? (
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            ) : (
                                <FaGoogle className=" size-3" />
                            )}
                            {isLoading === 'google' ? 'Authenticating...' : 'Continue with Google'}
                        </Button>

                        <Button
                            onClick={handleGithubAuth}
                            disabled={isLoading === 'github'}
                            variant="bordered"
                        >
                            {isLoading === 'github' ? (
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            ) : (
                                <FaGithub className=" size-3" />
                            )}
                            {isLoading === 'github' ? 'Authenticating...' : 'Continue with GitHub'}
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
                    <span className="text-muted-foreground/50">
                        By using this app, you agree to the{' '}
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
