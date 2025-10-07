import { NextRequest, NextResponse } from 'next/server';
import { AppwriteException } from 'node-appwrite';

import { auth } from '@repo/common/auth/server';
import {
    createThreadDocument,
    listThreadDocuments,
    RemoteThreadDocument,
} from '@repo/common/appwrite/chat.server';
import { ThreadPayload } from '@repo/shared/chat-serialization';

const buildRemotePayload = (payload: ThreadPayload): RemoteThreadDocument => {
    return {
        threadId: payload.thread.id,
        title: payload.thread.title,
        updatedAt: payload.thread.updatedAt,
        payload,
    };
};

export async function GET() {
    const session = await auth();
    const { userId, jwt, sessionId } = session;

    if (!userId) {
        return NextResponse.json({ threads: [] }, { status: 200 });
    }

    try {
        const threads = await listThreadDocuments(userId, jwt || sessionId ? { jwt, sessionId } : undefined);
        return NextResponse.json({ threads }, { status: 200 });
    } catch (error: unknown) {
        console.error('Failed to load threads from Appwrite', error);
        if (error instanceof AppwriteException && error.code === 401) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json(
            { error: 'Unable to load chat threads at this time.' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const session = await auth();
    const { userId, jwt, sessionId } = session;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: ThreadPayload;
    try {
        payload = (await request.json()) as ThreadPayload;
    } catch (error) {
        console.error('Invalid payload for thread creation', error);
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (!payload?.thread?.id) {
        return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    try {
        await createThreadDocument(
            userId,
            buildRemotePayload(payload),
            jwt || sessionId ? { jwt, sessionId } : undefined
        );
    } catch (error: unknown) {
        console.error('Failed to create thread in Appwrite', error);
        if (error instanceof AppwriteException && error.code === 401) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json(
            { error: 'Unable to create thread on Appwrite' },
            { status: 500 }
        );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
}
