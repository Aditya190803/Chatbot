import { createTask } from '@repo/orchestrator';
import { CoreMessage, generateText } from 'ai';
import { ModelEnum } from '../../models';
import { getLanguageModel } from '../../providers';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { handleError, sendEvents } from '../utils';

export const imageGenerationTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'image-generation',
    execute: async ({ events, context, signal }) => {
        const { updateStatus, updateAnswer, updateObject } = sendEvents(events);
        const question = context?.get('question');
        const messages = (context?.get('messages') as CoreMessage[]) || [];

        if (!question && messages.length === 0) {
            throw new Error('No prompt provided for image generation');
        }

        updateStatus('PENDING');
        updateAnswer({ text: 'Generating images with Gemini…', status: 'PENDING' });

        const model = getLanguageModel(ModelEnum.GEMINI_2_5_FLASH_IMAGE);

        const generation = await generateText({
            model,
            ...(messages.length > 0 ? { messages } : { prompt: question ?? '' }),
            abortSignal: signal,
        });

        const files = ((generation as unknown as { files?: Array<{ mediaType?: string; base64?: string; url?: string }> })
            .files ?? []) as Array<{ mediaType?: string; base64?: string; url?: string }>;

        const imageFiles = files.filter(file => file.mediaType?.startsWith('image/'));

        if (!imageFiles.length) {
            throw new Error('Gemini did not return any images. Try refining your request.');
        }

        const images = imageFiles.map((file, index: number) => {
            const base64 = file.base64;
            const sanitizedBase64 = base64?.replace(/^data:[^,]+,/, '');
            const dataUrl = base64
                ? base64.startsWith('data:')
                    ? base64
                    : `data:${file.mediaType};base64,${sanitizedBase64}`
                : undefined;

            return {
                id: `image-${index}`,
                mediaType: file.mediaType,
                dataUrl,
                url: file.url ?? null,
            };
        });

        const summary = generation.text?.trim() ?? '';

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
