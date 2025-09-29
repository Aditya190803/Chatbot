import { useCallback } from 'react';
import { useChatStore } from '../store';

export const useTitleGeneration = () => {
    const updateThread = useChatStore(state => state.updateThread);
    
    const generateAndUpdateTitle = useCallback(async (
        threadId: string,
        userMessage: string,
        assistantResponse: string
    ) => {
        try {
            const response = await fetch('/api/title-generation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    threadId,
                    userMessage,
                    assistantResponse,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate title');
            }

            const { title } = await response.json();
            
            // Update the thread with the generated title
            await updateThread({
                id: threadId,
                title,
            });

            return title;
        } catch (error) {
            console.error('Error generating title:', error);
            // Fallback to a simple title based on user message
            const fallbackTitle = userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : '');
            await updateThread({
                id: threadId,
                title: fallbackTitle,
            });
            return fallbackTitle;
        }
    }, [updateThread]);

    return { generateAndUpdateTitle };
};