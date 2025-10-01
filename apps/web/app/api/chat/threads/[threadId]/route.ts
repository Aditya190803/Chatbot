import { NextRequest, NextResponse } from 'next/server';
import { AppwriteException } from 'node-appwrite';

import { auth } from '@repo/common/auth/server';
import { deleteThreadDocument, updateThreadDocument } from '@repo/common/appwrite/chat.server';
import { ThreadPayload } from '@repo/shared/chat-serialization';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { threadId: string } }
) {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = params;

    if (!threadId) {
        return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    let payload: ThreadPayload;
    try {
        payload = (await request.json()) as ThreadPayload;
    } catch (error) {
        console.error('Invalid payload for thread update', error);
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (!payload?.thread?.id) {
        return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    try {
        await updateThreadDocument(threadId, {
            title: payload.thread.title,
            updatedAt: payload.thread.updatedAt,
            payload,
        });
    } catch (error) {
        console.error(`Failed to update thread ${threadId} in Appwrite`, error);
        if (error instanceof AppwriteException && error.code === 404) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
        }
        return NextResponse.json(
            { error: 'Unable to update thread on Appwrite' },
            { status: 500 }
        );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { threadId: string } }
) {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = params;

    if (!threadId) {
        return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    try {
        await deleteThreadDocument(threadId);
    } catch (error) {
        console.error(`Failed to delete thread ${threadId} in Appwrite`, error);
        if (error instanceof AppwriteException && error.code === 404) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
        }
        return NextResponse.json(
            { error: 'Unable to delete thread on Appwrite' },
            { status: 500 }
        );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
}
