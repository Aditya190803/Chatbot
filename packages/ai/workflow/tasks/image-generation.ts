import { createTask } from '@repo/orchestrator';
import { CoreMessage } from 'ai';
import { ModelEnum } from '../../models';
import { MissingProviderKeyError, Providers, getProviderApiKey } from '../../providers';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { handleError, sendEvents } from '../utils';

export const imageGenerationTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'image-generation',
    execute: async ({ events, context, signal }) => {
        const { updateStatus, updateAnswer, updateObject } = sendEvents(events);
        const question = context?.get('question');
        const messages = (context?.get('messages') as CoreMessage[]) || [];

        const prompt = buildPrompt({ question, messages });
        if (!prompt) {
            throw new Error('No prompt provided for image generation');
        }

        updateStatus('PENDING');
        updateAnswer({ text: 'Generating images with Gemini…', status: 'PENDING' });

        const apiKey = getProviderApiKey(Providers.GOOGLE);
        if (!apiKey) {
            throw new MissingProviderKeyError(Providers.GOOGLE);
        }

        const { images, summary } = await generateGeminiImages({
            prompt,
            apiKey,
            modelId: ModelEnum.GEMINI_2_5_FLASH_IMAGE,
            signal,
        });

        if (!images.length) {
            throw new Error('Gemini did not return any images. Try refining your request.');
        }

        updateObject({
            type: 'image-generation',
            summary,
            images,
        });

        const responseText = summary || `Generated ${images.length} image${
            images.length > 1 ? 's' : ''
        } with Gemini.`;

        updateAnswer({
            text: responseText,
            finalText: responseText,
            status: 'COMPLETED',
        });

        updateStatus('COMPLETED');

        context?.update('answer', () => responseText);
    },
    onError: handleError,
});

const buildPrompt = ({
    question,
    messages,
}: {
    question?: string | null;
    messages: CoreMessage[];
}) => {
    if (question?.trim()) {
        return question.trim();
    }

    const userMessages = messages
        .filter(message => message.role === 'user')
        .map(message =>
            typeof message.content === 'string'
                ? message.content
                : message.content
                      .filter(part => part.type === 'text')
                      .map(part => part.text)
                      .join('\n')
        )
        .filter(Boolean);

    return userMessages[userMessages.length - 1]?.trim() ?? '';
};

const generateGeminiImages = async ({
    prompt,
    apiKey,
    modelId,
    signal,
}: {
    prompt: string;
    apiKey: string;
    modelId: string;
    signal?: AbortSignal;
}) => {
    const controller = new AbortController();
    const abortHandler = () => controller.abort();

    signal?.addEventListener('abort', abortHandler, { once: true });

    try {
    const maxAttempts = 3;
    const retryDelays = [800, 1600, 3200];

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            let response: Response;

            try {
                response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            contents: [
                                {
                                    role: 'user',
                                    parts: [{ text: prompt }],
                                },
                            ],
                            generationConfig: {
                                candidateCount: 1,
                            },
                        }),
                        signal: controller.signal,
                    }
                );
            } catch (error) {
                if (controller.signal.aborted || (signal?.aborted && error instanceof DOMException)) {
                    throw error;
                }

                if (attempt < maxAttempts - 1) {
                    await sleep(retryDelays[attempt]);
                    continue;
                }

                throw error instanceof Error
                    ? error
                    : new Error('Gemini image generation failed due to an unknown network error.');
            }

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                let errorPayload: { error?: { status?: string; message?: string } } | undefined;

                try {
                    errorPayload = errorText ? JSON.parse(errorText) : undefined;
                } catch (error) {
                    errorPayload = undefined;
                }

                const status = errorPayload?.error?.status;
                const message = errorPayload?.error?.message || errorText || response.statusText;
                const isRateLimited =
                    response.status === 429 || status === 'RESOURCE_EXHAUSTED' || status === 'ABORTED';
                const quotaZero = /limit:\s*0/i.test(message || '');
                const retryAfterSeconds =
                    parseRetryAfterSeconds(response.headers.get('retry-after')) ??
                    parseRetryAfterSecondsFromMessage(message);

                if (isRateLimited) {
                    if (quotaZero) {
                        throw new Error(
                            'Gemini image generation is temporarily unavailable because the configured API key has no remaining quota. Add your own Gemini API key or wait for the quota to reset.'
                        );
                    }

                    if (attempt < maxAttempts - 1) {
                        const retryDelayMs = retryAfterSeconds
                            ? Math.max(retryAfterSeconds * 1000, retryDelays[attempt])
                            : retryDelays[attempt];
                        await sleep(retryDelayMs);
                        continue;
                    }

                    const retryHint = retryAfterSeconds
                        ? ` Try again in about ${Math.ceil(retryAfterSeconds)} seconds.`
                        : '';
                    throw new Error(
                        `Gemini image generation is currently rate limited. ${message}${retryHint}`
                    );
                }

                throw new Error(`Gemini image generation failed (${response.status}): ${message}`);
            }

            const data = (await response.json()) as GeminiGenerateContentResponse;
            const promptFeedback = data.promptFeedback;

            if (promptFeedback?.blockReason) {
                throw new Error(`Gemini blocked the prompt: ${promptFeedback.blockReason}`);
            }

            const { images, summary } = extractImagesAndSummary(data);

            if (!images.length && attempt < maxAttempts - 1) {
                await sleep(retryDelays[attempt]);
                continue;
            }

            return { images, summary };
        }

        throw new Error(
            'Gemini image generation failed after multiple attempts. Please try again with a different prompt shortly.'
        );
    } finally {
        signal?.removeEventListener('abort', abortHandler);
    }
};

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const parseRetryAfterSeconds = (retryAfterHeader: string | null): number | undefined => {
    if (!retryAfterHeader) return undefined;

    const numeric = Number(retryAfterHeader);
    if (!Number.isNaN(numeric)) {
        return numeric;
    }

    const dateValue = Date.parse(retryAfterHeader);
    if (!Number.isNaN(dateValue)) {
        return Math.max(0, (dateValue - Date.now()) / 1000);
    }

    return undefined;
};

const parseRetryAfterSecondsFromMessage = (message: string | undefined): number | undefined => {
    if (!message) return undefined;

    const match = message.match(/retry in\s*(\d+(?:\.\d+)?)\s*s/i);
    if (match) {
        return Number.parseFloat(match[1]);
    }

    return undefined;
};

type GeminiGenerateContentResponse = {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                inlineData?: {
                    mimeType?: string;
                    data?: string;
                };
                text?: string;
            }>;
        };
    }>;
    promptFeedback?: {
        blockReason?: string;
    };
};

const extractImagesAndSummary = (data: GeminiGenerateContentResponse) => {
    const images: Array<{
        id: string;
        mediaType?: string;
        dataUrl?: string;
        url?: string | null;
    }> = [];
    const summaryParts: string[] = [];

    data.candidates?.forEach(candidate => {
        candidate.content?.parts?.forEach(part => {
            if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('image/')) {
                const base64 = part.inlineData.data;
                images.push({
                    id: `image-${images.length}`,
                    mediaType: part.inlineData.mimeType,
                    dataUrl: `data:${part.inlineData.mimeType};base64,${base64}`,
                    url: null,
                });
            } else if (part.text) {
                summaryParts.push(part.text.trim());
            }
        });
    });

    const summary = summaryParts.filter(Boolean).join('\n').trim();

    return { images, summary };
};
