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
        const response = await fetch(
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
                        responseMimeType: 'image/png',
                        candidateCount: 4,
                    },
                }),
                signal: controller.signal,
            }
        );

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(
                `Gemini image generation failed (${response.status}): ${errorText || response.statusText}`
            );
        }

        const data = (await response.json()) as GeminiGenerateContentResponse;

        const { images, summary } = extractImagesAndSummary(data);

        const promptFeedback = data.promptFeedback;
        if (promptFeedback?.blockReason) {
            throw new Error(`Gemini blocked the prompt: ${promptFeedback.blockReason}`);
        }

        return { images, summary };
    } finally {
        signal?.removeEventListener('abort', abortHandler);
    }
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
