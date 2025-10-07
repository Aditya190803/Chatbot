import { serializeThread, serializeThreadItem, deserializeThread, deserializeThreadItem, ThreadPayload } from '@repo/shared/chat-serialization';
import { Thread, ThreadItem } from '@repo/shared/types';

type RemoteThreadDocument = {
    threadId: string;
    title: string;
    updatedAt: string;
    payload: ThreadPayload;
};

type ThreadsResponse = {
    threads: RemoteThreadDocument[];
};

const headers = {
    'Content-Type': 'application/json',
};

const withCredentials: RequestInit = {
    credentials: 'include',
};

const handleResponse = async (response: Response) => {
    if (response.ok) {
        return response;
    }

    let message = 'Failed to communicate with chat persistence API.';
    try {
        const data = await response.json();
        if (typeof data?.error === 'string') {
            message = data.error;
        }
    } catch {
        // ignore JSON parse errors
    }

    throw new Error(message);
};

export const fetchRemoteThreads = async (): Promise<Array<{ thread: Thread; items: ThreadItem[] }>> => {
    const response = await fetch('/api/chat/threads', {
        ...withCredentials,
        method: 'GET',
    });

    if (response.status === 401) {
        throw new Error('unauthorized');
    }

    await handleResponse(response);

    const data = (await response.json()) as ThreadsResponse;

    return (data.threads || []).map(({ payload }) => ({
        thread: deserializeThread(payload.thread),
        items: (payload.items || []).map(deserializeThreadItem),
    }));
};

const buildPayload = (thread: Thread, items: ThreadItem[]) => ({
    thread: serializeThread(thread),
    items: items.map(item => serializeThreadItem(item)),
});

export const createRemoteThread = async (thread: Thread, items: ThreadItem[]): Promise<void> => {
    const response = await fetch('/api/chat/threads', {
        ...withCredentials,
        method: 'POST',
        headers,
        body: JSON.stringify(buildPayload(thread, items)),
    });

    if (response.status === 401) {
        throw new Error('unauthorized');
    }

    await handleResponse(response);
};

export const updateRemoteThread = async (thread: Thread, items: ThreadItem[]): Promise<void> => {
    const response = await fetch(`/api/chat/threads/${thread.id}`, {
        ...withCredentials,
        method: 'PATCH',
        headers,
        body: JSON.stringify(buildPayload(thread, items)),
    });

    if (response.status === 404) {
        // Document might not exist yet; attempt to create instead
        await createRemoteThread(thread, items);
        return;
    }

    if (response.status === 401) {
        throw new Error('unauthorized');
    }

    await handleResponse(response);
};

export const deleteRemoteThread = async (threadId: string): Promise<void> => {
    const response = await fetch(`/api/chat/threads/${threadId}`, {
        ...withCredentials,
        method: 'DELETE',
    });

    if (response.status === 404) {
        return;
    }

    if (response.status === 401) {
        throw new Error('unauthorized');
    }

    await handleResponse(response);
};
