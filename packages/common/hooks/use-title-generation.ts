import { useCallback } from 'react';
import { useChatStore } from '../store';

type ConversationMessage = {
    role: 'user' | 'assistant';
    content: string;
};

type TitleGenerationStage = 'initial' | 'refine';

type GenerateTitleArgs = {
    threadId: string;
    conversation: ConversationMessage[];
    stage: TitleGenerationStage;
    fallbackTitle?: string;
};

export const useTitleGeneration = () => {
    const updateThread = useChatStore(state => state.updateThread);

    const generateAndUpdateTitle = useCallback(
        async ({ threadId, conversation, stage, fallbackTitle }: GenerateTitleArgs) => {
            console.log('[TitleGeneration] Starting generation:', {
                threadId,
                stage,
                conversationLength: conversation.length,
                hasFallback: !!fallbackTitle
            });

            const safeFallbackRaw =
                fallbackTitle && fallbackTitle.length > 0
                    ? fallbackTitle
                    : conversation.find(msg => msg.role === 'user')?.content ?? 'New Thread';

            const safeFallbackBase = safeFallbackRaw.trim().length
                ? safeFallbackRaw.trim()
                : 'New Thread';

            try {
                console.log('[TitleGeneration] Calling API...');
                const response = await fetch('/api/title-generation', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        threadId,
                        conversation,
                        stage,
                    }),
                });

                console.log('[TitleGeneration] API response status:', response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('[TitleGeneration] API error:', errorText);
                    throw new Error('Failed to generate title');
                }

                const { title } = await response.json();

                console.log('[TitleGeneration] Received title from API:', title);

                const cleanTitle = typeof title === 'string' ? title.trim() : '';

                if (!cleanTitle.length) {
                    console.warn('[TitleGeneration] Empty title received, using fallback');
                    throw new Error('Received empty title from generator');
                }

                const truncatedTitle =
                    cleanTitle.length > 80 ? `${cleanTitle.slice(0, 79)}…` : cleanTitle;

                console.log('[TitleGeneration] Updating thread with title:', truncatedTitle);

                await updateThread({
                    id: threadId,
                    title: truncatedTitle,
                    autoTitleVersion: stage === 'initial' ? 1 : 2,
                    autoTitleUpdatedAt: new Date(),
                });

                return truncatedTitle;
            } catch (error) {
                console.error('Error generating title:', error);

                const fallback =
                    safeFallbackBase.length > 60
                        ? `${safeFallbackBase.slice(0, 59)}…`
                        : safeFallbackBase;

                await updateThread({
                    id: threadId,
                    title: fallback,
                    autoTitleVersion: stage === 'initial' ? 1 : 2,
                    autoTitleUpdatedAt: new Date(),
                });

                return fallback;
            }
        },
        [updateThread]
    );

    return { generateAndUpdateTitle };
};