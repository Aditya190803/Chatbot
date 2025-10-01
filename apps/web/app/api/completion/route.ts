import { auth } from '@repo/common/auth/server';
import { ChatModeConfig } from '@repo/shared/config';
import { Geo, geolocation } from '@vercel/functions';
import { NextRequest } from 'next/server';
import { executeStream, sendMessage } from './stream-handlers';
import { completionRequestSchema, SSE_HEADERS, StreamController } from './types';

export async function POST(request: NextRequest) {
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: SSE_HEADERS });
    }

    try {
        const session = await auth();
        const userId = session?.userId ?? undefined;

        const parsed = await request.json().catch(() => ({}));
        const validatedBody = completionRequestSchema.safeParse(parsed);

        if (!validatedBody.success) {
            return new Response(
                JSON.stringify({
                    error: 'Invalid request body',
                    details: validatedBody.error.format(),
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { data } = validatedBody;

        // Check if authentication is required for this chat mode
        if (!!ChatModeConfig[data.mode]?.isAuthRequired && !userId) {
            return new Response(JSON.stringify({ error: 'Authentication required' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const enhancedHeaders = {
            ...SSE_HEADERS,
        };

        const encoder = new TextEncoder();
        const abortController = new AbortController();

        request.signal.addEventListener('abort', () => {
            abortController.abort();
        });

        const gl = geolocation(request);

        console.log('gl', gl);

        const stream = createCompletionStream({
            data,
            userId,
            abortController,
            gl,
        });

        return new Response(stream, { headers: enhancedHeaders });
    } catch (error) {
        console.error('Error in POST handler:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: String(error) }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

type GuardedStreamController = StreamController & { __closed?: boolean };

function markControllerClosed(controller: GuardedStreamController) {
    if (!controller.__closed) {
        controller.__closed = true;
        try {
            controller.close();
        } catch (error) {
            if (
                !(error instanceof TypeError) ||
                !error.message.toLowerCase().includes('invalid state')
            ) {
                throw error;
            }
        }
    }
}

function createCompletionStream({
    data,
    userId,
    abortController,
    gl,
}: {
    data: any;
    userId?: string;
    abortController: AbortController;
    gl: Geo;
}) {
    const encoder = new TextEncoder();
    let guardedControllerRef: GuardedStreamController | null = null;

    return new ReadableStream({
        async start(controller) {
            const guardedController = controller as GuardedStreamController;
            guardedControllerRef = guardedController;
            let heartbeatInterval: NodeJS.Timeout | null = null;

            heartbeatInterval = setInterval(() => {
                if (!guardedController.__closed) {
                    try {
                        controller.enqueue(encoder.encode(': heartbeat\n\n'));
                    } catch (error) {
                        if (
                            error instanceof TypeError &&
                            error.message.toLowerCase().includes('invalid state')
                        ) {
                            guardedController.__closed = true;
                            return;
                        }
                        throw error;
                    }
                }
            }, 15000);

            try {
                await executeStream({
                    controller: guardedController,
                    encoder,
                    data,
                    abortController,
                    gl,
                    userId: userId ?? undefined,
                });
            } catch (error) {
                if (abortController.signal.aborted) {
                    console.log('abortController.signal.aborted');
                    sendMessage(guardedController, encoder, {
                        type: 'done',
                        status: 'aborted',
                        threadId: data.threadId,
                        threadItemId: data.threadItemId,
                        parentThreadItemId: data.parentThreadItemId,
                    });
                } else {
                    console.log('sending error message');
                    sendMessage(guardedController, encoder, {
                        type: 'done',
                        status: 'error',
                        error: error instanceof Error ? error.message : String(error),
                        threadId: data.threadId,
                        threadItemId: data.threadItemId,
                        parentThreadItemId: data.parentThreadItemId,
                    });
                }
            } finally {
                if (heartbeatInterval) {
                    clearInterval(heartbeatInterval);
                }
                markControllerClosed(guardedController);
            }
        },
        cancel() {
            console.log('cancelling stream');
            abortController.abort();
            if (guardedControllerRef) {
                markControllerClosed(guardedControllerRef);
            }
        },
    });
}
