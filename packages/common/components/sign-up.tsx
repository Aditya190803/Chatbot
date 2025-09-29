import { useSignUp } from '@clerk/nextjs';
import { isClerkAPIResponseError } from '@clerk/nextjs/errors';
import { Button, Input } from '@repo/ui';
import { IconX, IconEye, IconEyeOff } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FaGithub, FaGoogle } from 'react-icons/fa';

type CustomSignUpProps = {
    redirectUrl?: string;
    onClose?: () => void;
};

export const CustomSignUp = ({
    redirectUrl = '/sign-in/sso-callback',
    onClose,
}: CustomSignUpProps) => {
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [code, setCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { signUp, isLoaded, setActive } = useSignUp();
    const router = useRouter();

    if (!isLoaded) return null;

    const handleVerify = async () => {
        if (code.length !== 6) {
            setError('Please enter the complete 6-digit code');
            return;
        }

        setIsLoading('verify');
        setError(''); // Clear any previous errors
        
        try {
            if (!signUp) return;
            
            const result = await signUp.attemptEmailAddressVerification({
                code,
            });

            if (result.status === 'complete') {
                setActive({ session: result.createdSessionId });
                router.push('/chat');
            } else {
                setError('Verification not complete. Please try again.');
            }
        } catch (error: any) {
            console.error('Verification error:', error);
            if (isClerkAPIResponseError(error)) {
                const errorMessage = error.errors[0]?.longMessage || error.errors[0]?.message;
                if (errorMessage?.includes('code')) {
                    setError('Invalid verification code. Please try again.');
                } else {
                    setError(errorMessage || 'Verification failed. Please try again.');
                }
            } else {
                setError('Something went wrong during verification. Please try again.');
            }
        } finally {
            setIsLoading(null);
        }
    };

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
        setError('');
        
        if (!validateForm()) {
            return;
        }

        setIsLoading('signup');
        
        try {
            if (!signUp) return;

            await signUp.create({
                firstName: formData.firstName,
                lastName: formData.lastName,
                emailAddress: formData.email,
                password: formData.password,
            });

            await signUp.prepareEmailAddressVerification({
                strategy: 'email_code',
            });

            setVerifying(true);
        } catch (error: any) {
            console.error('Sign-up error:', error);
            if (isClerkAPIResponseError(error)) {
                setError(error.errors[0]?.longMessage || 'Sign-up failed. Please try again.');
            } else {
                setError('Something went wrong during sign-up. Please try again.');
            }
        } finally {
            setIsLoading(null);
        }
    };

    const handleGoogleAuth = async () => {
        setIsLoading('google');

        try {
            if (!signUp) return;
            await signUp.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl,
                redirectUrlComplete: redirectUrl,
            });
        } catch (error) {
            console.error('Google authentication error:', error);
            setError('Google authentication failed. Please try again.');
        } finally {
            setIsLoading(null);
        }
    };

    const handleGithubAuth = async () => {
        setIsLoading('github');

        try {
            if (!signUp) return;
            await signUp.authenticateWithRedirect({
                strategy: 'oauth_github',
                redirectUrl,
                redirectUrlComplete: redirectUrl,
            });
        } catch (error) {
            console.error('GitHub authentication error:', error);
            setError('GitHub authentication failed. Please try again.');
        } finally {
            setIsLoading(null);
        }
    };

    const handleResendCode = async () => {
        if (!signUp) return;
        
        setIsLoading('resend');
        try {
            await signUp.prepareEmailAddressVerification({
                strategy: 'email_code',
            });
            setError('');
        } catch (error) {
            console.error('Error resending code:', error);
            setError('Failed to resend code. Please try again.');
        } finally {
            setIsLoading(null);
        }
    };

    if (verifying) {
        return (
            <div className="flex w-[350px] flex-col items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                    <h2 className="font-clash text-foreground !text-brand text-center text-[24px] font-semibold leading-tight">
                        Check your email
                    </h2>
                    <p className="text-muted-foreground text-center text-sm">
                        We've sent a verification code to {formData.email}. Please check your inbox and enter the code to complete your registration.
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
                            isLoading === 'resend' ? 'pointer-events-none opacity-70' : ''
                        }`}
                        onClick={handleResendCode}
                    >
                        {isLoading === 'resend' ? 'Sending...' : 'Resend Code'}
                    </span>
                </p>

                <div id="clerk-captcha"></div>
                {error && (
                    <div className="text-center text-sm text-rose-400">
                        {error}
                    </div>
                )}
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
                            onClick={() => setShowPassword(!showPassword)}
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
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                Creating account...
                            </>
                        ) : (
                            'Create account'
                        )}
                    </Button>

                    {error && (
                        <div className="text-center text-sm text-rose-400">
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex w-full items-center gap-4">
                    <div className="bg-border h-px flex-1"></div>
                    <span className="text-muted-foreground text-sm">or continue with</span>
                    <div className="bg-border h-px flex-1"></div>
                </div>

                <div className="flex w-full flex-col space-y-2">
                    <Button
                        onClick={handleGoogleAuth}
                        disabled={isLoading === 'google'}
                        variant="bordered"
                    >
                        {isLoading === 'google' ? (
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        ) : (
                            <FaGoogle className="size-3" />
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
                            <FaGithub className="size-3" />
                        )}
                        {isLoading === 'github' ? 'Authenticating...' : 'Continue with GitHub'}
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