'use client';

import { useAuth } from '@repo/common/context';
import { useWorkflowWorker } from '@repo/ai/worker';
import { ChatMode, ChatModeConfig } from '@repo/shared/config';
import { Answer, ThreadItem } from '@repo/shared/types';
import { buildCoreMessagesFromThreadItems, plausible, selectModelForQuery } from '@repo/shared/utils';
import { nanoid } from 'nanoid';
import { useParams, useRouter } from 'next/navigation';
import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
} from 'react';
import { useApiKeysStore, useChatStore, useMcpToolsStore } from '../store';

export type AgentContextType = {
    runAgent: (body: any) => Promise<void>;
    handleSubmit: (args: {
        formData: FormData;
        newThreadId?: string;
        existingThreadItemId?: string;
        newChatMode?: string;
        messages?: ThreadItem[];
        useWebSearch?: boolean;
        showSuggestions?: boolean;
        branchParentId?: string;
    }) => Promise<void>;
    updateContext: (threadId: string, data: any) => void;
};

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider = ({ children }: { children: ReactNode }) => {
    const { threadId: currentThreadId } = useParams();
    const { isSignedIn } = useAuth();

    const updateThreadItem = useChatStore(state => state.updateThreadItem);
    const setIsGenerating = useChatStore(state => state.setIsGenerating);
    const setAbortController = useChatStore(state => state.setAbortController);
    const createThreadItem = useChatStore(state => state.createThreadItem);
    const setCurrentThreadItem = useChatStore(state => state.setCurrentThreadItem);
    const setCurrentSources = useChatStore(state => state.setCurrentSources);
    const updateThread = useChatStore(state => state.updateThread);
    const chatMode = useChatStore(state => state.chatMode);
    const customInstructions = useChatStore(state => state.customInstructions);
    const getConversationThreadItems = useChatStore(state => state.getConversationThreadItems);
    const { push } = useRouter();

    const getSelectedMCP = useMcpToolsStore(state => state.getSelectedMCP);
    const apiKeys = useApiKeysStore(state => state.getAllKeys);
    const hasApiKeyForChatMode = useApiKeysStore(state => state.hasApiKeyForChatMode);

    // In-memory store for thread items
    const threadItemMap = useMemo(() => new Map<string, ThreadItem>(), []);
    const pendingTitleStages = useRef<Map<string, Set<'initial' | 'refine'>>>(new Map());

    const maybeGenerateTitle = useCallback(
        async (threadId: string) => {
            const state = useChatStore.getState();
            const targetThread = state.threads.find(thread => thread.id === threadId);

            if (!targetThread || targetThread.isTemporary) {
                return;
            }

            const conversationItems = getConversationThreadItems(threadId);
            if (!conversationItems.length) {
                return;
            }

            const messages = conversationItems.flatMap(item => {
                const parts: { role: 'user' | 'assistant'; content: string }[] = [];
                if (item.query?.trim()) {
                    parts.push({ role: 'user', content: item.query.trim() });
                }

                const answerText = item.answer?.finalText || item.answer?.text;
                if (answerText?.trim()) {
                    parts.push({ role: 'assistant', content: answerText.trim() });
                }

                return parts;
            });

            if (messages.length < 2) {
                return;
            }

            const existingStages = pendingTitleStages.current.get(threadId) ?? new Set();
            let stage: 'initial' | 'refine' | null = null;

            if (!existingStages.has('initial')) {
                stage = 'initial';
            } else if (messages.length >= 6 && !existingStages.has('refine')) {
                stage = 'refine';
            }

            if (!stage) {
                return;
            }

            const limitedMessages =
                stage === 'initial'
                    ? messages.slice(0, 2)
                    : messages.slice(-6);

            const payloadMessages = limitedMessages.map(message => ({
                role: message.role,
                content: message.content.slice(0, 4000),
            }));

            const nextStages = new Set(existingStages);
            nextStages.add(stage);
            pendingTitleStages.current.set(threadId, nextStages);

            try {
                const response = await fetch('/api/title-generation', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        threadId,
                        conversation: payloadMessages,
                        stage,
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Title generation failed');
                }

                const result = await response.json();
                const title = typeof result.title === 'string' ? result.title.trim() : '';

                if (title) {
                    await updateThread({ id: threadId, title });
                }
            } catch (error) {
                console.error('Auto title generation failed:', error);
                const stages = pendingTitleStages.current.get(threadId);
                if (stages) {
                    stages.delete(stage);
                    if (stages.size === 0) {
                        pendingTitleStages.current.delete(threadId);
                    }
                }
            }
        },
        [getConversationThreadItems, updateThread]
    );

    // Define common event types to reduce repetition
    const EVENT_TYPES = [
        'steps',
        'sources',
        'answer',
        'error',
        'status',
        'suggestions',
        'toolCalls',
        'toolResults',
        'object',
        'metrics',
    ];

    // Helper: Update in-memory and store thread item
    const handleThreadItemUpdate = useCallback(
        (
            threadId: string,
            threadItemId: string,
            eventType: string,
            eventData: any,
            parentThreadItemId?: string,
            shouldPersistToDB: boolean = true
        ) => {
            const prevItem = threadItemMap.get(threadItemId) || ({} as ThreadItem);
            const incomingAnswer = eventType === 'answer' ? eventData.answer || {} : undefined;
            const incomingMetrics = eventType === 'metrics' ? eventData.metrics || {} : undefined;

            let nextAnswer: Answer | undefined = prevItem.answer;
            let nextThinkingProcess = prevItem.thinkingProcess;

            if (incomingAnswer) {
                const {
                    text: incomingText,
                    finalText: incomingFinalText,
                    fullText: incomingFullText,
                    thinkingProcess: incomingThinkingProcess,
                    status: incomingStatus,
                    ...incomingRest
                } = incomingAnswer as {
                    text?: string;
                    finalText?: string;
                    fullText?: string;
                    thinkingProcess?: string;
                    status?: string;
                    [key: string]: unknown;
                };

                const previousAnswer: Answer = prevItem.answer ?? { text: '' };
                const previousText = previousAnswer.text ?? '';
                const hasFinalText =
                    typeof incomingFinalText === 'string' && incomingFinalText.trim().length > 0;
                const hasFullText =
                    typeof incomingFullText === 'string' && incomingFullText.trim().length > 0;

                const resolvedFinalText = hasFinalText
                    ? incomingFinalText!
                    : hasFullText
                        ? incomingFullText!
                        : typeof previousAnswer.finalText === 'string' && previousAnswer.finalText.length > 0
                            ? previousAnswer.finalText
                            : previousText;

                const resolvedText = hasFinalText
                    ? incomingFinalText!
                    : hasFullText
                        ? incomingFullText!
                        : `${previousText}${incomingText ?? ''}`;

                nextAnswer = {
                    ...previousAnswer,
                    ...incomingRest,
                    status:
                        typeof incomingStatus === 'string' ? incomingStatus : previousAnswer.status,
                    text: resolvedText,
                    finalText: resolvedFinalText,
                } as Answer;

                nextThinkingProcess =
                    typeof incomingThinkingProcess === 'string' && incomingThinkingProcess.trim().length > 0
                        ? incomingThinkingProcess
                        : prevItem.thinkingProcess;
            }

            const updatedItem: ThreadItem = {
                ...prevItem,
                query: eventData?.query || prevItem.query || '',
                mode: eventData?.mode || prevItem.mode,
                threadId,
                parentId: parentThreadItemId || prevItem.parentId,
                id: threadItemId,
                object: eventData?.object || prevItem.object,
                createdAt: prevItem.createdAt || new Date(),
                updatedAt: new Date(),
                ...(eventType === 'answer'
                    ? {
                          answer: nextAnswer,
                          thinkingProcess: nextThinkingProcess,
                      }
                    : eventType === 'metrics'
                        ? {
                              tokensUsed:
                                  typeof incomingMetrics?.totalTokens === 'number'
                                      ? incomingMetrics.totalTokens
                                      : prevItem.tokensUsed,
                              generationDurationMs:
                                  typeof incomingMetrics?.durationMs === 'number'
                                      ? incomingMetrics.durationMs
                                      : prevItem.generationDurationMs,
                          }
                        : { [eventType]: eventData[eventType] }),
            };

            threadItemMap.set(threadItemId, updatedItem);
            updateThreadItem(threadId, updatedItem, { persist: shouldPersistToDB });
        },
        [threadItemMap, updateThreadItem]
    );

    const { startWorkflow, abortWorkflow } = useWorkflowWorker(
        useCallback(
            (data: any) => {
                if (
                    data?.threadId &&
                    data?.threadItemId &&
                    data.event &&
                    EVENT_TYPES.includes(data.event)
                ) {
                    handleThreadItemUpdate(
                        data.threadId,
                        data.threadItemId,
                        data.event,
                        data,
                        data.parentThreadItemId
                    );
                }

                if (data.type === 'done') {
                    setIsGenerating(false);
                    if (data?.threadItemId) {
                        threadItemMap.delete(data.threadItemId);
                    }
                    if (data?.threadId && data.status === 'complete') {
                        void maybeGenerateTitle(data.threadId);
                    }
                }
            },
            [handleThreadItemUpdate, setIsGenerating, threadItemMap, maybeGenerateTitle]
        )
    );

    const runAgent = useCallback(
        async (body: any) => {
            const abortController = new AbortController();
            setAbortController(abortController);
            setIsGenerating(true);
            const startTime = performance.now();

            abortController.signal.addEventListener('abort', () => {
                console.info('Abort controller triggered');
                setIsGenerating(false);
                updateThreadItem(
                    body.threadId,
                    {
                        id: body.threadItemId,
                        status: 'ABORTED',
                    },
                    { persist: true }
                );
            });

            try {
                const response = await fetch('/api/completion', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    credentials: 'include',
                    cache: 'no-store',
                    signal: abortController.signal,
                });

                if (!response.ok) {
                    let errorText = await response.text();

                    if (response.status === 429 && isSignedIn) {
                        errorText =
                            'You have reached the daily limit of requests. Please try again tomorrow or Use your own API key.';
                    }

                    if (response.status === 429 && !isSignedIn) {
                        errorText =
                            'You have reached the daily limit of requests. Please sign in to enjoy more requests.';
                    }

                    setIsGenerating(false);
                    updateThreadItem(
                        body.threadId,
                        {
                            id: body.threadItemId,
                            status: 'ERROR',
                            error: errorText,
                        },
                        { persist: true }
                    );
                    console.error('Error response:', errorText);
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                if (!response.body) {
                    throw new Error('No response body received');
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let lastDbUpdate = Date.now();
                const DB_UPDATE_INTERVAL = 1000;
                let eventCount = 0;
                const streamStartTime = performance.now();

                let buffer = '';

                while (true) {
                    try {
                        const { value, done } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const messages = buffer.split('\n\n');
                        buffer = messages.pop() || '';

                        for (const message of messages) {
                            if (!message.trim()) continue;

                            const eventMatch = message.match(/^event: (.+)$/m);
                            const dataMatch = message.match(/^data: (.+)$/m);

                            if (eventMatch && dataMatch) {
                                const currentEvent = eventMatch[1];
                                eventCount++;

                                try {
                                    const data = JSON.parse(dataMatch[1]);
                                    if (
                                        EVENT_TYPES.includes(currentEvent) &&
                                        data?.threadId &&
                                        data?.threadItemId
                                    ) {
                                        const shouldPersistToDB =
                                            Date.now() - lastDbUpdate >= DB_UPDATE_INTERVAL;
                                        handleThreadItemUpdate(
                                            data.threadId,
                                            data.threadItemId,
                                            currentEvent,
                                            data,
                                            data.parentThreadItemId,
                                            shouldPersistToDB
                                        );
                                        if (shouldPersistToDB) {
                                            lastDbUpdate = Date.now();
                                        }
                                    } else if (currentEvent === 'done' && data.type === 'done') {
                                        setIsGenerating(false);
                                        const streamDuration = performance.now() - streamStartTime;
                                        console.log(
                                            'done event received',
                                            eventCount,
                                            `Stream duration: ${streamDuration.toFixed(2)}ms`
                                        );
                                        if (data.threadItemId) {
                                            threadItemMap.delete(data.threadItemId);
                                        }

                                        if (data.status === 'error') {
                                            console.error('Stream error:', data.error);
                                            if (data.threadId && data.threadItemId) {
                                                updateThreadItem(
                                                    data.threadId,
                                                    {
                                                        id: data.threadItemId,
                                                        status: 'ERROR',
                                                        error:
                                                            data.error ||
                                                            'Something went wrong. Please try again.',
                                                    },
                                                    { persist: true }
                                                );
                                            }
                                        } else if (data.status === 'aborted') {
                                            if (data.threadId && data.threadItemId) {
                                                updateThreadItem(
                                                    data.threadId,
                                                    {
                                                        id: data.threadItemId,
                                                        status: 'ABORTED',
                                                    },
                                                    { persist: true }
                                                );
                                            }
                                        } else if (data.status === 'complete') {
                                            if (data.threadId && data.threadItemId) {
                                                updateThreadItem(
                                                    data.threadId,
                                                    {
                                                        id: data.threadItemId,
                                                        status: 'COMPLETED',
                                                    },
                                                    { persist: true }
                                                );
                                                void maybeGenerateTitle(data.threadId);
                                            }
                                        }
                                    }
                                } catch (jsonError) {
                                    console.warn(
                                        'JSON parse error for data:',
                                        dataMatch[1],
                                        jsonError
                                    );
                                }
                            }
                        }
                    } catch (readError) {
                        console.error('Error reading from stream:', readError);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue;
                    }
                }
            } catch (streamError: any) {
                const totalTime = performance.now() - startTime;
                console.error(
                    'Fatal stream error:',
                    streamError,
                    `Total time: ${totalTime.toFixed(2)}ms`
                );
                setIsGenerating(false);
                if (streamError.name === 'AbortError') {
                    updateThreadItem(
                        body.threadId,
                        {
                            id: body.threadItemId,
                            status: 'ABORTED',
                            error: 'Generation aborted',
                        },
                        { persist: true }
                    );
                } else if (streamError.message.includes('429')) {
                    updateThreadItem(
                        body.threadId,
                        {
                            id: body.threadItemId,
                            status: 'ERROR',
                            error: 'You have reached the daily limit of requests. Please try again tomorrow or Use your own API key.',
                        },
                        { persist: true }
                    );
                } else {
                    updateThreadItem(
                        body.threadId,
                        {
                            id: body.threadItemId,
                            status: 'ERROR',
                            error: 'Something went wrong. Please try again.',
                        },
                        { persist: true }
                    );
                }
            } finally {
                setIsGenerating(false);

                const totalTime = performance.now() - startTime;
                console.info(`Stream completed in ${totalTime.toFixed(2)}ms`);
            }
        },
        [
            setAbortController,
            setIsGenerating,
            updateThreadItem,
            handleThreadItemUpdate,
            EVENT_TYPES,
            threadItemMap,
            maybeGenerateTitle,
        ]
    );

    const handleSubmit = useCallback(
        async ({
            formData,
            newThreadId,
            existingThreadItemId,
            newChatMode,
            messages,
            useWebSearch,
            showSuggestions,
            branchParentId,
        }: {
            formData: FormData;
            newThreadId?: string;
            existingThreadItemId?: string;
            newChatMode?: string;
            messages?: ThreadItem[];
            useWebSearch?: boolean;
            showSuggestions?: boolean;
            branchParentId?: string;
        }) => {
            const mode = (newChatMode || chatMode) as ChatMode;
            if (
                !isSignedIn &&
                !!ChatModeConfig[mode as keyof typeof ChatModeConfig]?.isAuthRequired
            ) {
                push('/sign-in');

                return;
            }

            const threadId = currentThreadId?.toString() || newThreadId;
            if (!threadId) return;
            const chatState = useChatStore.getState();
            const existingThreadItem = existingThreadItemId
                ? chatState.threadItems.find(item => item.id === existingThreadItemId)
                : undefined;

            const parentThreadItemId = existingThreadItem?.parentId ?? '';

            // Generate a new thread item ID for the branch
            const optimisticAiThreadItemId = nanoid();
            const query = formData.get('query') as string;
            const imageAttachment = formData.get('imageAttachment') as string;

            // Auto-select model if in AUTO mode
            let actualMode = mode;
            if (mode === ChatMode.Auto) {
                actualMode = selectModelForQuery(query, !!imageAttachment);
                console.info('[AutoModel] Selected model:', actualMode, 'for query:', query.substring(0, 50));
            }

            const existingThread = chatState.threads.find(thread => thread.id === threadId);

            if (!existingThread) {
                updateThread({ id: threadId, title: query });
            }

            const historicalMessages = messages || getConversationThreadItems(threadId);

            // For branch operations, determine the branch info
            let branchGroupId: string | undefined;
            let branchIndex: number | undefined;
            
            if (branchParentId) {
                // Find all existing branches for this parent
                const existingBranches = chatState.threadItems.filter(
                    item => item.branchParentId === branchParentId || item.id === branchParentId
                );
                
                // Get the branch group ID from existing items or create a new one
                const parentItem = chatState.threadItems.find(item => item.id === branchParentId);
                branchGroupId = parentItem?.branchGroupId || branchParentId;
                
                // If the parent doesn't have branch info, update it
                if (parentItem && !parentItem.branchGroupId) {
                    updateThreadItem(threadId, {
                        id: branchParentId,
                        branchGroupId: branchGroupId,
                        branchIndex: 0,
                    }, { persist: true });
                }
                
                // Calculate the next branch index
                branchIndex = existingBranches.length;
            }

            const aiThreadItem: ThreadItem = {
                id: optimisticAiThreadItemId,
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'QUEUED',
                threadId,
                parentId: parentThreadItemId || undefined,
                query,
                imageAttachment,
                mode: actualMode,
                // Branch fields
                branchParentId,
                branchGroupId,
                branchIndex,
            };

            createThreadItem(aiThreadItem);
            setCurrentThreadItem(aiThreadItem);
            setIsGenerating(true);
            setCurrentSources([]);

            plausible.trackEvent('send_message', {
                props: {
                    mode: actualMode,
                    originalMode: mode === ChatMode.Auto ? 'auto' : mode,
                },
            });

            // Build core messages array - for branches, use messages up to the branch parent
            let coreMessages;
            if (branchParentId) {
                // Find the branch parent's position and use messages before it
                const branchParentIndex = historicalMessages.findIndex(m => m.id === branchParentId);
                const messagesForBranch = branchParentIndex >= 0 
                    ? historicalMessages.slice(0, branchParentIndex)
                    : historicalMessages.filter(m => m.id !== branchParentId);
                
                coreMessages = buildCoreMessagesFromThreadItems({
                    messages: messagesForBranch,
                    query,
                    imageAttachment,
                });
            } else {
                coreMessages = buildCoreMessagesFromThreadItems({
                    messages: historicalMessages,
                    query,
                    imageAttachment,
                });
            }

            if (hasApiKeyForChatMode(actualMode)) {
                const abortController = new AbortController();
                setAbortController(abortController);
                setIsGenerating(true);

                abortController.signal.addEventListener('abort', () => {
                    console.info('Abort signal received');
                    setIsGenerating(false);
                    abortWorkflow();
                    updateThreadItem(threadId, { id: optimisticAiThreadItemId, status: 'ABORTED' });
                });

                startWorkflow({
                    mode: actualMode,
                    question: query,
                    threadId,
                    messages: coreMessages,
                    mcpConfig: getSelectedMCP(),
                    threadItemId: optimisticAiThreadItemId,
                    parentThreadItemId,
                    customInstructions,
                    apiKeys: apiKeys(),
                });
            } else {
                runAgent({
                    mode: actualMode,
                    prompt: query,
                    threadId,
                    messages: coreMessages,
                    mcpConfig: getSelectedMCP(),
                    threadItemId: optimisticAiThreadItemId,
                    customInstructions,
                    parentThreadItemId,
                    webSearch: useWebSearch,
                    showSuggestions: showSuggestions ?? true,
                });
            }
        },
        [
            isSignedIn,
            currentThreadId,
            chatMode,
            updateThread,
            createThreadItem,
            setCurrentThreadItem,
            setIsGenerating,
            setCurrentSources,
            abortWorkflow,
            startWorkflow,
            customInstructions,
            getSelectedMCP,
            apiKeys,
            hasApiKeyForChatMode,
            updateThreadItem,
            runAgent,
            getConversationThreadItems,
        ]
    );

    const updateContext = useCallback(
        (threadId: string, data: any) => {
            console.info('Updating context', data);
            updateThreadItem(threadId, {
                id: data.threadItemId,
                parentId: data.parentThreadItemId,
                threadId: data.threadId,
                metadata: data.context,
            });
        },
        [updateThreadItem]
    );

    const contextValue = useMemo(
        () => ({
            runAgent,
            handleSubmit,
            updateContext,
        }),
        [runAgent, handleSubmit, updateContext]
    );

    return <AgentContext.Provider value={contextValue}>{children}</AgentContext.Provider>;
};

export const useAgentStream = (): AgentContextType => {
    const context = useContext(AgentContext);
    if (!context) {
        throw new Error('useAgentStream must be used within an AgentProvider');
    }
    return context;
};
