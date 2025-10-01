'use client';

import { Account, Client, ID } from 'appwrite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { AuthUser } from '@repo/common/auth';
import { mapAccountToAuthUser } from '@repo/common/auth';
import { useChatStore } from '@repo/common/store';

const API_SESSION_ENDPOINT = '/api/auth/session';
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

const PUBLIC_ENV = {
    NEXT_PUBLIC_APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
};

const getPublicEnv = <T extends keyof typeof PUBLIC_ENV>(key: T) => PUBLIC_ENV[key];

type EmailSignInToken = {
    userId: string;
    email: string;
};

type SignUpPayload = {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
};

type AuthContextValue = {
    user: AuthUser | null;
    isLoaded: boolean;
    signOut: () => Promise<void>;
    signInWithPassword: (email: string, password: string) => Promise<void>;
    signUpWithPassword: (payload: SignUpPayload) => Promise<EmailSignInToken>;
    requestEmailCode: (email: string) => Promise<EmailSignInToken>;
    verifyEmailCode: (userId: string, code: string) => Promise<void>;
    signInWithGoogle: (redirectPath?: string) => Promise<void>;
    completeOAuthSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const getClient = () => {
    const endpoint = getPublicEnv('NEXT_PUBLIC_APPWRITE_ENDPOINT');
    const project = getPublicEnv('NEXT_PUBLIC_APPWRITE_PROJECT_ID');

    if (!endpoint || !project) {
        console.error('Appwrite environment variables are missing. Please configure NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID.');
        return null;
    }

    const client = new Client();
    client.setEndpoint(endpoint);
    client.setProject(project);

    const extendedClient = client as Client & {
        setSelfSigned?: (value: boolean) => Client;
        setAutoRefresh?: (value: boolean) => Client;
    };

    if (process.env.NODE_ENV !== 'production') {
        extendedClient.setSelfSigned?.(true);
    }

    extendedClient.setAutoRefresh?.(true);
    return client;
};

const buildName = (firstName?: string, lastName?: string) =>
    [firstName, lastName].filter(Boolean).join(' ').trim() || undefined;

const createSessionCookie = async (account: Account) => {
    try {
        const jwt = await account.createJWT();
        await fetch(API_SESSION_ENDPOINT, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ jwt: jwt.jwt }),
        });
        return true;
    } catch (error) {
        console.warn('Failed to create Appwrite JWT; falling back to session refresh endpoint.', error);

        const response = await fetch(API_SESSION_ENDPOINT, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw error;
        }

        return false;
    }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const client = useMemo(() => getClient(), []);
    const account = useMemo(() => (client ? new Account(client) : null), [client]);
    const enableAppwriteSync = useChatStore(state => state.enableAppwriteSync);
    const disableAppwriteSync = useChatStore(state => state.disableAppwriteSync);
    const syncMode = useChatStore(state => state.syncMode);

    const [state, setState] = useState<{ user: AuthUser | null; isLoaded: boolean }>({
        user: null,
        isLoaded: false,
    });

    const refreshUser = useCallback(async () => {
        if (!account) {
            setState(prev => ({ ...prev, isLoaded: true }));
            return;
        }

        try {
            const current = await account.get();
            await createSessionCookie(account);
            setState({ user: mapAccountToAuthUser(current as any), isLoaded: true });
        } catch (error) {
            try {
                const response = await fetch(API_SESSION_ENDPOINT, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    setState({ user: null, isLoaded: true });
                    return;
                }

                const data = await response.json();
                setState({ user: data.user ?? null, isLoaded: true });
            } catch {
                setState({ user: null, isLoaded: true });
            }
        }
    }, [account]);

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    useEffect(() => {
        if (!state.isLoaded) {
            return;
        }

        if (state.user) {
            enableAppwriteSync().catch((error: unknown) => {
                console.error('Failed to enable Appwrite sync after sign-in', error);
            });
        } else if (syncMode === 'appwrite') {
            disableAppwriteSync().catch((error: unknown) => {
                console.error('Failed to disable Appwrite sync after sign-out', error);
            });
        }
    }, [state.user?.id, state.isLoaded, enableAppwriteSync, disableAppwriteSync, syncMode]);

    useEffect(() => {
        if (!account || !state.user) {
            return;
        }

        const interval = setInterval(async () => {
            try {
                await createSessionCookie(account);
            } catch (error) {
                console.error('Failed to refresh Appwrite JWT', error);
            }
        }, REFRESH_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [account, state.user]);

    const postAuthentication = useCallback(async () => {
        if (!account) {
            throw new Error('Appwrite account client is not initialized');
        }

        const current = await account.get();
        await createSessionCookie(account);
        setState({ user: mapAccountToAuthUser(current as any), isLoaded: true });
    }, [account]);

    const signInWithPassword = useCallback(
        async (email: string, password: string) => {
            if (!account) {
                throw new Error('Appwrite account client is not initialized');
            }

            await (account as any).createEmailSession(email, password);
            await postAuthentication();
        },
        [account, postAuthentication]
    );

    const requestEmailCode = useCallback(
        async (email: string): Promise<EmailSignInToken> => {
            if (!account) {
                throw new Error('Appwrite account client is not initialized');
            }

            const token = await (account as any).createEmailToken({ email });
            return { userId: token.userId, email };
        },
        [account]
    );

    const verifyEmailCode = useCallback(
        async (userId: string, code: string) => {
            if (!account) {
                throw new Error('Appwrite account client is not initialized');
            }

            await (account as any).updateEmailSession(userId, code);
            await postAuthentication();
        },
        [account, postAuthentication]
    );

    const signUpWithPassword = useCallback(
        async ({ email, password, firstName, lastName }: SignUpPayload): Promise<EmailSignInToken> => {
            if (!account) {
                throw new Error('Appwrite account client is not initialized');
            }

            const userId = ID.unique();
            await account.create(userId, email, password, buildName(firstName, lastName));

            if (firstName || lastName) {
                await (account as any).updateName(buildName(firstName, lastName) ?? '');
            }

            const token = await (account as any).createEmailToken({ email });
            return { userId: token.userId, email };
        },
        [account]
    );

    const signOut = useCallback(async () => {
        try {
            if (account) {
                await account.deleteSessions();
            }
        } catch (error) {
            console.warn('Failed to delete Appwrite sessions', error);
        }

        await fetch(API_SESSION_ENDPOINT, {
            method: 'DELETE',
            credentials: 'include',
        });

        setState({ user: null, isLoaded: true });
    }, [account]);

    const signInWithGoogle = useCallback(
        async (redirectPath: string = '/sign-in/sso-callback') => {
            if (!account) {
                throw new Error('Appwrite account client is not initialized');
            }

            const origin = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL;
            if (!origin) {
                throw new Error('Unable to resolve application origin for OAuth');
            }

            const success = new URL(redirectPath, origin).toString();
            const failure = new URL('/sign-in', origin).toString();

            await (account as any).createOAuth2Session('google', success, failure);
        },
        [account]
    );

    const completeOAuthSession = useCallback(async () => {
        await postAuthentication();
    }, [postAuthentication]);

    const contextValue = useMemo<AuthContextValue>(
        () => ({
            user: state.user,
            isLoaded: state.isLoaded,
            signOut,
            signInWithPassword,
            signUpWithPassword,
            requestEmailCode,
            verifyEmailCode,
            signInWithGoogle,
            completeOAuthSession,
        }),
        [
            state.user,
            state.isLoaded,
            signOut,
            signInWithPassword,
            signUpWithPassword,
            requestEmailCode,
            verifyEmailCode,
            signInWithGoogle,
            completeOAuthSession,
        ]
    );

    return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};

export const useAuth = () => {
    const context = useAuthContext();
    return {
        isLoaded: context.isLoaded,
        isSignedIn: Boolean(context.user),
        userId: context.user?.id ?? null,
        user: context.user,
        signOut: context.signOut,
    };
};

export const useUser = () => {
    const context = useAuthContext();
    return {
        isLoaded: context.isLoaded,
        isSignedIn: Boolean(context.user),
        user: context.user,
    };
};

export const useAuthActions = () => {
    const context = useAuthContext();
    return {
        signInWithPassword: context.signInWithPassword,
        signUpWithPassword: context.signUpWithPassword,
        requestEmailCode: context.requestEmailCode,
        verifyEmailCode: context.verifyEmailCode,
        signOut: context.signOut,
        signInWithGoogle: context.signInWithGoogle,
        completeOAuthSession: context.completeOAuthSession,
    };
};
