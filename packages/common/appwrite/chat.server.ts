import { AppwriteException, Client, Databases, Permission, Query, Role } from 'node-appwrite';
import { ThreadPayload } from '@repo/shared/chat-serialization';

type ChatConfig = {
    endpoint: string;
    projectId: string;
    apiKey?: string;
    databaseId: string;
    collectionId: string;
};

type RemoteThreadDocument = {
    threadId: string;
    title: string;
    updatedAt: string;
    payload: ThreadPayload;
};

const MAX_TITLE_LENGTH = 500;

const serializePayload = (payload: ThreadPayload): string => {
    try {
        return JSON.stringify(payload);
    } catch (error) {
        console.error('Failed to serialize thread payload for Appwrite:', error);
        throw new Error('Unable to serialize chat thread payload for persistence.');
    }
};

const deserializePayload = (rawPayload: unknown): ThreadPayload => {
    if (!rawPayload) {
        throw new Error('Empty payload returned from Appwrite');
    }

    if (typeof rawPayload === 'string') {
        try {
            return JSON.parse(rawPayload) as ThreadPayload;
        } catch (error) {
            console.error('Failed to parse stored thread payload from Appwrite:', error);
            throw new Error('Corrupted chat payload received from Appwrite.');
        }
    }

    return rawPayload as ThreadPayload;
};

const sanitizeString = (value: unknown, fallback: string, maxLength?: number): string => {
    const baseValue = typeof value === 'string' ? value : value != null ? String(value) : '';
    const trimmed = baseValue.trim();
    const normalized = trimmed.length > 0 ? trimmed : fallback;
    if (typeof maxLength === 'number' && maxLength > 0 && normalized.length > maxLength) {
        return normalized.slice(0, maxLength);
    }
    return normalized;
};

export type AppwriteAuthContext = {
    jwt?: string | null;
    sessionId?: string | null;
};

const getConfig = (): ChatConfig => {
    const endpoint = process.env.APPWRITE_ENDPOINT;
    const projectId = process.env.APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;
    const databaseId = process.env.APPWRITE_DATABASE_ID;
    const collectionId = process.env.APPWRITE_THREADS_COLLECTION_ID;

    if (!endpoint || !projectId || !databaseId || !collectionId) {
        throw new Error(
            'Appwrite environment variables are missing. Please configure APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_DATABASE_ID, and APPWRITE_THREADS_COLLECTION_ID.'
        );
    }

    return {
        endpoint,
        projectId,
        apiKey: apiKey || undefined,
        databaseId,
        collectionId,
    };
};

type DatabaseClientOptions = {
    forceUserClient?: boolean;
};

const buildAppwriteClient = (
    authContext?: AppwriteAuthContext,
    options: DatabaseClientOptions = {}
) => {
    const { endpoint, projectId, apiKey } = getConfig();

    const client = new Client();
    client.setEndpoint(endpoint);
    client.setProject(projectId);

    if (!options.forceUserClient && apiKey) {
        client.setKey(apiKey);
        return client;
    }

    if (authContext?.jwt) {
        client.setJWT(authContext.jwt);
        return client;
    }

    if (authContext?.sessionId) {
        (client as any).setSession?.(authContext.sessionId);
        return client;
    }

    if (apiKey && !options.forceUserClient) {
        client.setKey(apiKey);
        return client;
    }

    throw new Error(
        'Appwrite credentials are missing. Provide APPWRITE_API_KEY or ensure a user session is available.'
    );
};

const getDatabases = (
    authContext?: AppwriteAuthContext,
    options: DatabaseClientOptions = {}
): Databases => {
    const client = buildAppwriteClient(authContext, options);
    return new Databases(client);
};

const getCollectionIdentifiers = () => {
    const { databaseId, collectionId } = getConfig();
    return { databaseId, collectionId };
};

const shouldRetryWithUserClient = (error: unknown): boolean => {
    if (!error) return false;

    if (
        error instanceof AppwriteException &&
        (error.code === 401 || error.code === 403)
    ) {
        if (typeof error.type === 'string' && error.type === 'user_unauthorized') {
            return true;
        }

        if (
            typeof error.message === 'string' &&
            error.message.toLowerCase().includes('missing scopes')
        ) {
            return true;
        }
    }

    if (
        error instanceof Error &&
        typeof error.message === 'string' &&
        error.message.toLowerCase().includes('appwrite credentials')
    ) {
        return true;
    }

    return false;
};

const withAppwriteDatabases = async <T>(
    operation: (databases: Databases) => Promise<T>,
    authContext?: AppwriteAuthContext
): Promise<T> => {
    let lastError: unknown;
    const hasUserContext = Boolean(authContext?.jwt || authContext?.sessionId);
    const attempts = hasUserContext ? [false, true] : [false];

    for (const forceUserClient of attempts) {
        try {
            const databases = getDatabases(authContext, { forceUserClient });
            return await operation(databases);
        } catch (error) {
            lastError = error;
            if (!hasUserContext || forceUserClient || !shouldRetryWithUserClient(error)) {
                break;
            }
        }
    }

    throw lastError instanceof Error ? lastError : new Error('Unknown Appwrite error');
};

export const listThreadDocuments = async (
    userId: string,
    authContext?: AppwriteAuthContext
): Promise<RemoteThreadDocument[]> => {
    const { databaseId, collectionId } = getCollectionIdentifiers();

    const documents = await withAppwriteDatabases(
        databases =>
            databases.listDocuments(databaseId, collectionId, [
                Query.equal('userId', userId),
                Query.orderDesc('updatedAt'),
            ]),
        authContext
    );

    return documents.documents.map(doc => ({
        threadId: doc.threadId as string,
        title: doc.title as string,
        updatedAt: doc.updatedAt as string,
        payload: deserializePayload(doc.payload),
    }));
};

export const createThreadDocument = async (
    userId: string,
    payload: RemoteThreadDocument,
    authContext?: AppwriteAuthContext
): Promise<void> => {
    const { databaseId, collectionId } = getCollectionIdentifiers();

    const normalizedTitle = sanitizeString(
        payload.title,
        'Untitled conversation',
        MAX_TITLE_LENGTH
    );
    const normalizedUpdatedAt = sanitizeString(
        payload.updatedAt,
        new Date().toISOString()
    );

    try {
        await withAppwriteDatabases(
            databases =>
                databases.createDocument(
                    databaseId,
                    collectionId,
                    payload.threadId,
                    {
                        threadId: payload.threadId,
                        userId,
                        title: normalizedTitle,
                        updatedAt: normalizedUpdatedAt,
                        payload: serializePayload(payload.payload),
                    },
                    [
                        Permission.read(Role.user(userId)),
                        Permission.update(Role.user(userId)),
                        Permission.delete(Role.user(userId)),
                    ]
                ),
            authContext
        );
    } catch (error) {
        if (error instanceof AppwriteException && error.code === 409) {
            await updateThreadDocument(
                payload.threadId,
                {
                    title: normalizedTitle,
                    updatedAt: normalizedUpdatedAt,
                    payload: payload.payload,
                },
                authContext
            );
            return;
        }

        throw error;
    }
};

export const updateThreadDocument = async (
    threadId: string,
    data: { title: string; updatedAt: string; payload: ThreadPayload },
    authContext?: AppwriteAuthContext
): Promise<void> => {
    const { databaseId, collectionId } = getCollectionIdentifiers();

    const normalizedTitle = sanitizeString(
        data.title,
        'Untitled conversation',
        MAX_TITLE_LENGTH
    );
    const normalizedUpdatedAt = sanitizeString(
        data.updatedAt,
        new Date().toISOString()
    );

    await withAppwriteDatabases(
        databases =>
            databases.updateDocument(databaseId, collectionId, threadId, {
                title: normalizedTitle,
                updatedAt: normalizedUpdatedAt,
                payload: serializePayload(data.payload),
            }),
        authContext
    );
};

export const deleteThreadDocument = async (
    threadId: string,
    authContext?: AppwriteAuthContext
): Promise<void> => {
    const { databaseId, collectionId } = getCollectionIdentifiers();

    await withAppwriteDatabases(
        databases => databases.deleteDocument(databaseId, collectionId, threadId),
        authContext
    );
};

export type { RemoteThreadDocument };
