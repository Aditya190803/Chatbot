import { createTask } from '@repo/orchestrator';
import { ChatModeConfig } from '@repo/shared/config';
import { getModelFromChatMode } from '../../models';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { ChunkBuffer, generateText, getHumanizedDate, handleError } from '../utils';
import { shouldUseWebSearchWithContext } from '../utils/smart-web-search';

const MAX_ALLOWED_CUSTOM_INSTRUCTIONS_LENGTH = 6000;

export const completionTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'completion',
    execute: async ({ events, context, signal, redirectTo }) => {
        if (!context) {
            throw new Error('Context is required but was not provided');
        }

        const customInstructions = context?.get('customInstructions');
        const mode = context.get('mode');
        const webSearch = context.get('webSearch') || false;

        let messages =
            context
                .get('messages')
                ?.filter(
                    message =>
                        (message.role === 'user' || message.role === 'assistant') &&
                        !!message.content
                ) || [];

        console.log('customInstructions', customInstructions);

        if (
            customInstructions &&
            customInstructions?.length < MAX_ALLOWED_CUSTOM_INSTRUCTIONS_LENGTH
        ) {
            messages = [
                {
                    role: 'system',
                    content: `Today is ${getHumanizedDate()}. and current location is ${context.get('gl')?.city}, ${context.get('gl')?.country}. \n\n ${customInstructions}`,
                },
                ...messages,
            ];
        }

        const model = getModelFromChatMode(mode);
        const modelConfig = mode ? ChatModeConfig[mode] : undefined;
        const hasNativeInternet = modelConfig?.nativeInternetAccess || false;

        // Enhanced native internet access: intelligently decide if web search is needed
        const searchDecision = await shouldUseWebSearchWithContext(
            messages,
            hasNativeInternet,
            webSearch,
            signal
        );

        // If AI determines web search is needed or user manually enabled it, redirect to search
        if (searchDecision.shouldSearch) {
            // Update context to indicate why web search was triggered
            if (searchDecision.autoEnabled) {
                context?.set('autoWebSearchReason', searchDecision.reasoning);
                context?.set('autoWebSearchEnabled', true);
            }
            
            redirectTo('quickSearch');
            return;
        }

        let internetAccessInfo = '';
        if (hasNativeInternet && !webSearch) {
            internetAccessInfo = `
        
        **Important**: You have native internet access capabilities. Even though the web search feature is not enabled, you can still:
        - Access current information and recent events
        - Look up real-time data, prices, and statistics
        - Provide up-to-date information about current affairs
        - Check recent developments in technology, business, and other fields
        - Access current weather, stock prices, and other live data when relevant
        
        For Indian context queries, prioritize:
        - Current INR exchange rates and market prices
        - Latest RBI policies and government regulations
        - Recent Indian startup funding, IPOs, and business news
        - Current Digital India initiatives and UPI statistics
        - Latest Supreme Court judgments and parliamentary developments
        - Real-time NSE/BSE stock prices and market indices
        `;
        }

        let prompt = `You are a helpful assistant that can answer questions and help with tasks.
        Today is ${getHumanizedDate()}.${internetAccessInfo}
        
        Before providing your final answer, please think through the problem step by step inside <think> tags. This thinking process helps you reason through complex problems and provide better responses.
        
        Use <think> tags like this:
        <think>
        Let me think about this step by step:
        1. First, I need to understand what the user is asking...
        2. Then I should consider...
        3. Finally, I can conclude...
        </think>
        
        After your thinking process, provide your clear, well-structured answer.
        `;

        let reasoningText = '';
        const reasoningBuffer = new ChunkBuffer({
            threshold: 120,
            breakOn: ['\n\n'],
            onFlush: (_chunk: string, fullText: string) => {
                reasoningText = fullText;
                events?.update('steps', prev => ({
                    ...prev,
                    0: {
                        ...prev?.[0],
                        id: 0,
                        status: 'COMPLETED',
                        steps: {
                            ...prev?.[0]?.steps,
                            reasoning: {
                                data: fullText,
                                status: 'COMPLETED',
                            },
                        },
                    },
                }));
            },
        });

        const chunkBuffer = new ChunkBuffer({
            threshold: 48,
            breakOn: ['\n', '. ', '.\n', '.', '! ', '!', '? ', '?'],
            onFlush: (text: string) => {
                events?.update('answer', current => ({
                    ...current,
                    text,
                    status: 'PENDING' as const,
                }));
            },
        });

        const { text: response, usage, durationMs } = await generateText({
            model,
            messages,
            prompt,
            signal,
            toolChoice: 'auto',
            maxSteps: 2,
            onReasoning: (chunk, fullText) => {
                reasoningBuffer.add(chunk);
            },
            onChunk: (chunk, fullText) => {
                chunkBuffer.add(chunk);
            },
        });

        reasoningBuffer.end();
        chunkBuffer.end();

        events?.update('answer', prev => ({
            ...prev,
            text: '',
            fullText: response,
            thinkingProcess: reasoningText,
            status: 'COMPLETED',
        }));

        events?.update('metrics', prev => ({
            ...prev,
            totalTokens: usage?.totalTokens ?? prev?.totalTokens ?? 0,
            promptTokens: usage?.promptTokens ?? prev?.promptTokens ?? 0,
            completionTokens: usage?.completionTokens ?? prev?.completionTokens ?? 0,
            durationMs: durationMs ?? prev?.durationMs ?? 0,
            model: model ?? prev?.model,
        }));

        context.update('answer', _ => response);

        events?.update('status', prev => 'COMPLETED');

        const onFinish = context.get('onFinish');
        if (onFinish) {
            onFinish({
                answer: response,
                threadId: context.get('threadId'),
                threadItemId: context.get('threadItemId'),
            });
        }
        return;
    },
    onError: handleError,
    route: ({ context }) => {
        if (context?.get('showSuggestions') && context.get('answer')) {
            return 'suggestions';
        }
        return 'end';
    },
});
