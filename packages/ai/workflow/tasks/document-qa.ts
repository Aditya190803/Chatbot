import { createTask } from '@repo/orchestrator';
import { logger } from '@repo/shared/logger';
import { documentStore } from '../../document-store';
import { getModelFromChatMode } from '../../models';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { handleError, sendEvents } from '../utils';

export const documentQATask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'documentQA',
    execute: async ({ events, context, signal }) => {
        if (!context) {
            throw new Error('Context is required but was not provided');
        }

        const question = context.get('question') || '';
        const mode = context.get('mode');
        const model = getModelFromChatMode(mode);
        const userId = context.get('userId'); // We'll need to pass this from the completion handler
        
        const { updateStep, nextStepId, updateAnswer, updateStatus } = sendEvents(events);
        const stepId = nextStepId();

        if (stepId) {
            updateStep({
                stepId: stepId + 1,
                stepStatus: 'PENDING',
                subSteps: {
                    documentSearch: { status: 'PENDING' },
                },
            });
        }

        try {
            // Use document store directly
            const result = await documentStore.generateRAGResponse(question, userId, model);

            if (stepId) {
                updateStep({
                    stepId: stepId + 1,
                    stepStatus: 'COMPLETED',
                    subSteps: {
                        documentSearch: { 
                            status: 'COMPLETED',
                            data: {
                                sourcesUsed: result.sources.length,
                            }
                        },
                    },
                });
            }

            // Update answer with streaming effect
            const words = result.response.split(' ');
            let currentText = '';
            
            for (let i = 0; i < words.length; i++) {
                if (signal?.aborted) break;
                
                currentText += (i > 0 ? ' ' : '') + words[i];
                updateAnswer({
                    text: currentText,
                    status: 'PENDING',
                });
                
                // Small delay for streaming effect
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            // Final answer update
            updateAnswer({
                text: '',
                finalText: result.response,
                status: 'COMPLETED',
            });

            // Update sources if available
            if (result.sources && result.sources.length > 0) {
                events?.update('sources', () => 
                    result.sources.map((source, index) => ({
                        title: source.metadata.filename,
                        link: `#document-${source.documentId}`,
                        index: index + 1,
                        snippet: source.content.substring(0, 150) + '...',
                    }))
                );
            }

            updateStatus('COMPLETED');
            context.update('answer', () => result.response);

            return result.response;

        } catch (error) {
            logger.error('Document Q&A error', error as Error);
            
            if (stepId) {
                updateStep({
                    stepId: stepId + 1,
                    stepStatus: 'ERROR',
                    subSteps: {
                        documentSearch: { 
                            status: 'ERROR',
                            data: { error: error instanceof Error ? error.message : 'Unknown error' }
                        },
                    },
                });
            }

            const errorMessage = "I encountered an error while searching your documents. Please make sure you have uploaded documents and try again.";
            
            updateAnswer({
                text: '',
                finalText: errorMessage,
                status: 'ERROR',
            });

            updateStatus('ERROR');
            throw error;
        }
    },
    onError: handleError,
    route: () => 'end',
});