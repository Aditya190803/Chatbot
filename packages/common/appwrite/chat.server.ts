import { Client, Databases, Permission, Query, Role } from 'node-appwrite';
import { ThreadPayload } from '@repo/shared/chat-serialization';

type ChatConfig = {
    endpoint: string;
    projectId: string;
    apiKey: string;
    databaseId: string;
    collectionId: string;
};

type RemoteThreadDocument = {
    threadId: string;
    title: string;
    updatedAt: string;
    payload: ThreadPayload;
};

const getConfig = (): ChatConfig => {
    const endpoint = process.env.APPWRITE_ENDPOINT;
    const projectId = process.env.APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;
    const databaseId = process.env.APPWRITE_DATABASE_ID;
    const collectionId = process.env.APPWRITE_THREADS_COLLECTION_ID;

    if (!endpoint || !projectId || !apiKey || !databaseId || !collectionId) {
        throw new Error(
            'Appwrite environment variables are missing. Please configure APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID, and APPWRITE_THREADS_COLLECTION_ID.'
        );
    }

    return { endpoint, projectId, apiKey, databaseId, collectionId };
};

const getDatabases = (): Databases => {
    const { endpoint, projectId, apiKey } = getConfig();

    const client = new Client();
    client.setEndpoint(endpoint);
    client.setProject(projectId);
    client.setKey(apiKey);

    return new Databases(client);
};

const getCollectionIdentifiers = () => {
    const { databaseId, collectionId } = getConfig();
    return { databaseId, collectionId };
};

export const listThreadDocuments = async (userId: string): Promise<RemoteThreadDocument[]> => {
    const databases = getDatabases();
    const { databaseId, collectionId } = getCollectionIdentifiers();

    const documents = await databases.listDocuments(databaseId, collectionId, [
        Query.equal('userId', userId),
        Query.orderDesc('updatedAt'),
    ]);

    return documents.documents.map(doc => ({
        threadId: doc.threadId as string,
        title: doc.title as string,
        updatedAt: doc.updatedAt as string,
        payload: doc.payload as ThreadPayload,
    }));
};

export const createThreadDocument = async (
    userId: string,
    payload: RemoteThreadDocument
): Promise<void> => {
    const databases = getDatabases();
    const { databaseId, collectionId } = getCollectionIdentifiers();

    await databases.createDocument(databaseId, collectionId, payload.threadId, {
        threadId: payload.threadId,
        userId,
        title: payload.title,
        updatedAt: payload.updatedAt,
        payload: payload.payload,
    }, [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId)),
    ]);
};

export const updateThreadDocument = async (
    threadId: string,
    data: { title: string; updatedAt: string; payload: ThreadPayload }
): Promise<void> => {
    const databases = getDatabases();
    const { databaseId, collectionId } = getCollectionIdentifiers();

    await databases.updateDocument(databaseId, collectionId, threadId, {
        title: data.title,
        updatedAt: data.updatedAt,
        payload: data.payload,
    });
};

export const deleteThreadDocument = async (threadId: string): Promise<void> => {
    const databases = getDatabases();
    const { databaseId, collectionId } = getCollectionIdentifiers();

    await databases.deleteDocument(databaseId, collectionId, threadId);
};

export type { RemoteThreadDocument };
