import { cookies } from 'next/headers';
import { Account, Client } from 'node-appwrite';

import { AUTH_COOKIE_NAME, AuthUser, mapAccountToAuthUser } from './user';

type AppwriteClientConfig = {
    jwt?: string;
    session?: string;
};

type AppwriteConfig = {
    endpoint: string;
    projectId: string;
};

class AppwriteConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AppwriteConfigError';
    }
}

let hasLoggedMissingConfigWarning = false;

const getAppwriteConfig = (): AppwriteConfig | null => {
    const endpoint = process.env.APPWRITE_ENDPOINT;
    const projectId = process.env.APPWRITE_PROJECT_ID;

    if (!endpoint || !projectId) {
        const message =
            'Appwrite environment variables (APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID) are not configured. Authentication features are disabled.';

        if (process.env.NODE_ENV === 'production') {
            throw new AppwriteConfigError(message);
        }

        if (!hasLoggedMissingConfigWarning) {
            console.warn(message);
            hasLoggedMissingConfigWarning = true;
        }

        return null;
    }

    return { endpoint, projectId };
};

const createAppwriteClient = ({ jwt, session }: AppwriteClientConfig = {}) => {
    const config = getAppwriteConfig();
    if (!config) {
        return null;
    }

    const client = new Client();
    client.setEndpoint(config.endpoint);
    client.setProject(config.projectId);

    if (jwt) {
        client.setJWT(jwt);
        return client;
    }

    if (session) {
        // Leveraging existing first-party Appwrite session cookies when JWT auth is disabled.
        // The Node SDK exposes setSession to forward the session ID with subsequent requests.
        (client as any).setSession?.(session);
        return client;
    }

    const apiKey = process.env.APPWRITE_API_KEY;
    if (apiKey) {
        client.setKey(apiKey);
    }

    return client;
};

export const getUserFromJWT = async (jwt: string): Promise<AuthUser | null> => {
    const client = createAppwriteClient({ jwt });
    if (!client) {
        return null;
    }

    try {
        const account = new Account(client);
        const user = await account.get();
        return mapAccountToAuthUser(user as any);
    } catch (error) {
        console.warn('Failed to fetch user from Appwrite JWT', error);
        return null;
    }
};

export const auth = async (): Promise<{
    userId: string | null;
    user: AuthUser | null;
    jwt: string | null;
    sessionId: string | null;
}> => {
    const cookieStore = await cookies();
    const jwt = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!jwt) {
        const config = getAppwriteConfig();
        if (!config) {
            return { userId: null, user: null, jwt: null, sessionId: null };
        }

        const { projectId } = config;
        const possibleSessionCookies = [`a_session_${projectId}`, `a_session_${projectId}_legacy`];

        const sessionCookie = possibleSessionCookies
            .map(name => cookieStore.get(name)?.value)
            .find((value): value is string => Boolean(value));

        if (!sessionCookie) {
            return { userId: null, user: null, jwt: null, sessionId: null };
        }

        try {
            const client = createAppwriteClient({ session: sessionCookie });
            if (!client) {
                return { userId: null, user: null, jwt: null, sessionId: null };
            }
            const account = new Account(client);
            const user = await account.get();
            const mapped = mapAccountToAuthUser(user as any);
            return { userId: mapped.id, user: mapped, jwt: null, sessionId: sessionCookie };
        } catch (error) {
            console.warn('Failed to hydrate auth session from Appwrite session cookie', error);
            return { userId: null, user: null, jwt: null, sessionId: null };
        }
    }

    const user = await getUserFromJWT(jwt);
    if (!user) {
        return { userId: null, user: null, jwt: null, sessionId: null };
    }

    return { userId: user.id, user, jwt, sessionId: null };
};
