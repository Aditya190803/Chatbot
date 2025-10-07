import {
    CitationProvider,
    FollowupSuggestions,
    ImageGenerationResult,
    MarkdownContent,
    Message,
    MessageActions,
    QuestionPrompt,
    SourceGrid,
    Steps,
    ThinkingProcess,
} from '@repo/common/components';
import { useAnimatedText } from '@repo/common/hooks';
import { useChatStore } from '@repo/common/store';
import { ThreadItem as ThreadItemType } from '@repo/shared/types';
import { Alert, AlertDescription, cn } from '@repo/ui';
import { DotSpinner } from '@repo/common/components';
import { IconAlertCircle, IconBook } from '@tabler/icons-react';
import { memo, useEffect, useMemo, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import type { ImageGenerationResultData } from '@repo/common/components';

const THINK_BLOCK_REGEX = /<think>([\s\S]*?)<\/think>/gi;
const ANSWER_BLOCK_REGEX = /<answer>([\s\S]*?)<\/answer>/gi;
const HIDDEN_TAG_REGEX = /<\/?(?:think|answer|final_answer|finalanswer|response|result|output|analysis|reasoning|thought|assistant_response)>/gi;

const cloneRegex = (regex: RegExp) => new RegExp(regex.source, regex.flags);
const stripAssistantTags = (value: string) => value.replace(cloneRegex(HIDDEN_TAG_REGEX), '');

const extractAnswerAndThinking = (
    rawAnswer?: string,
    explicitThinking?: string
): { answer: string; thinking: string } => {
    const thinkingParts = new Set<string>();
    const answerSegments: string[] = [];

    const normalizedExplicit = explicitThinking?.trim();
    if (normalizedExplicit) {
        const cleanedExplicit = stripAssistantTags(normalizedExplicit).trim();
        if (cleanedExplicit) {
            thinkingParts.add(cleanedExplicit);
        }
    }

    let sanitizedAnswer = rawAnswer ?? '';

    if (sanitizedAnswer) {
        const blockRegex = cloneRegex(THINK_BLOCK_REGEX);
        let hasBlockMatch = false;

        sanitizedAnswer = sanitizedAnswer.replace(blockRegex, (_match: string, group: string) => {
            hasBlockMatch = true;
            const part = group?.trim();
            if (part) {
                const cleanedPart = stripAssistantTags(part).trim();
                if (cleanedPart) {
                    thinkingParts.add(cleanedPart);
                }
            }
            return '';
        });

        if (!hasBlockMatch) {
            const lowerCaseAnswer = sanitizedAnswer.toLowerCase();
            const openIndex = lowerCaseAnswer.indexOf('<think>');
            if (openIndex !== -1) {
                const tail = sanitizedAnswer.slice(openIndex + '<think>'.length);
                const cleanedTail = stripAssistantTags(tail).trim();
                if (cleanedTail) {
                    thinkingParts.add(cleanedTail);
                }
                sanitizedAnswer = sanitizedAnswer.slice(0, openIndex);
            }
        }
    }

    if (sanitizedAnswer) {
        sanitizedAnswer = sanitizedAnswer.replace(cloneRegex(ANSWER_BLOCK_REGEX), (_: string, group: string) => {
            const cleaned = stripAssistantTags(group).trim();
            if (cleaned) {
                answerSegments.push(cleaned);
            }
            return cleaned;
        });
    }

    sanitizedAnswer = stripAssistantTags(sanitizedAnswer).trim();

    if (!sanitizedAnswer && answerSegments.length > 0) {
        sanitizedAnswer = answerSegments.join('\n\n');
    }

    if (!sanitizedAnswer && thinkingParts.size > 0) {
        const thinkingArray = Array.from(thinkingParts);
        const finalCue = thinkingArray
            .slice()
            .reverse()
            .find(part => /(^|\n)\s*(final (answer|response)|answer)\s*[:\-]?/i.test(part));

        if (finalCue) {
            const lines = finalCue
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean);
            const cueLine = [...lines]
                .reverse()
                .find(line => /^(final (answer|response)|answer)\s*[:\-]?/i.test(line));

            const extracted = cueLine
                ? cueLine.replace(/^(final (answer|response)|answer)\s*[:\-]?\s*/i, '').trim()
                : finalCue.trim();

            if (extracted) {
                sanitizedAnswer = extracted;
                thinkingParts.delete(finalCue);
            }
        }
    }

    if (!sanitizedAnswer && thinkingParts.size > 0) {
        const fallback = Array.from(thinkingParts).pop();
        if (fallback) {
            sanitizedAnswer = fallback;
            thinkingParts.delete(fallback);
        }
    }

    const thinking = Array.from(thinkingParts)
        .map(part => part.trim())
        .filter(Boolean)
        .join('\n\n')
        .trim();

    return {
        answer: sanitizedAnswer,
        thinking,
    };
};

export const ThreadItem = memo(
    ({
        threadItem,
        isGenerating,
        isLast,
    }: {
        isAnimated: boolean;
        threadItem: ThreadItemType;
        isGenerating: boolean;
        isLast: boolean;
    }) => {
        const rawAnswerText = useMemo(() => {
            const text = threadItem.answer?.text?.trim();
            if (text && text.length > 0) {
                return threadItem.answer?.text || '';
            }
            return threadItem.answer?.finalText || '';
        }, [threadItem.answer?.text, threadItem.answer?.finalText]);

        const { answer: answerText, thinking: derivedThinkingProcess } = useMemo(
            () => extractAnswerAndThinking(rawAnswerText, threadItem.thinkingProcess),
            [rawAnswerText, threadItem.thinkingProcess]
        );

        const { isAnimationComplete, text: animatedText } = useAnimatedText(
            answerText,
            isLast && isGenerating
        );
        const displayAnswer = isAnimationComplete ? answerText : animatedText;
        const setCurrentSources = useChatStore(state => state.setCurrentSources);
        const messageRef = useRef<HTMLDivElement>(null);

        const { ref: inViewRef, inView } = useInView({});

        useEffect(() => {
            if (inView && threadItem.id) {
                useChatStore.getState().setActiveThreadItemView(threadItem.id);
            }
        }, [inView, threadItem.id]);

        useEffect(() => {
            const sources =
                Object.values(threadItem.steps || {})
                    ?.filter(
                        step =>
                            step.steps && 'read' in step?.steps && !!step.steps?.read?.data?.length
                    )
                    .flatMap(step => step.steps?.read?.data?.map((result: any) => result.link))
                    .filter((link): link is string => link !== undefined) || [];
            return setCurrentSources(sources);
        }, [threadItem, setCurrentSources]);

        const hasAnswer = useMemo(() => {
            return (answerText?.length || 0) > 0;
        }, [answerText]);

        const hasResponse = useMemo(() => {
            return (
                !!threadItem?.steps ||
                !!answerText ||
                !!threadItem?.object ||
                !!threadItem?.error ||
                threadItem?.status === 'COMPLETED' ||
                threadItem?.status === 'ABORTED' ||
                threadItem?.status === 'ERROR'
            );
        }, [threadItem, answerText]);

        const isFinalStatus = useMemo(
            () => ['COMPLETED', 'ERROR', 'ABORTED'].includes(threadItem?.status ?? ''),
            [threadItem?.status]
        );

        const isAnswerReady = hasAnswer || isFinalStatus;

        const imageGenerationResult =
            threadItem.object?.type === 'image-generation'
                ? (threadItem.object as ImageGenerationResultData)
                : null;

        const sanitizedImageResult =
            imageGenerationResult &&
            (imageGenerationResult.summary === answerText
                ? { ...imageGenerationResult, summary: undefined }
                : imageGenerationResult);
        return (
            <CitationProvider sources={threadItem.sources || []}>
                <div className="w-full" ref={inViewRef} id={`thread-item-${threadItem.id}`}>
                    <div className={cn('flex w-full flex-col items-start gap-3 pt-4')}>
                        {threadItem.query && (
                            <Message
                                message={threadItem.query}
                                imageAttachment={threadItem?.imageAttachment}
                                threadItem={threadItem}
                            />
                        )}

                        <div className="text-muted-foreground flex flex-row items-center gap-1.5 text-xs font-medium">
                            <IconBook size={16} strokeWidth={2} />
                            Answer
                        </div>

                        {threadItem.steps && (
                            <Steps
                                steps={Object.values(threadItem?.steps || {})}
                                threadItem={threadItem}
                            />
                        )}

                        {!hasResponse && (
                            <div className="w-full">
                                <div className="border-border/40 bg-background/80 relative overflow-hidden rounded-xl border px-4 py-4 shadow-subtle-sm backdrop-blur-sm dark:border-border/30 dark:bg-background/60">
                                    <div className="bg-primary/5 pointer-events-none absolute inset-0 animate-pulse" aria-hidden />
                                    <div className="relative flex items-center gap-3">
                                        <div className="border-border/50 bg-background/90 flex h-10 w-10 items-center justify-center rounded-full border shadow-inner">
                                            <DotSpinner />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-foreground">
                                                Generating response…
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                The assistant is processing your request and will reply in just a moment.
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Display thinking process only if actual thinking content exists */}
                        {derivedThinkingProcess.length > 0 && (
                            <ThinkingProcess
                                content={derivedThinkingProcess}
                                isGenerating={isGenerating && isLast}
                                isAnswerReady={isAnswerReady}
                            />
                        )}

                        {/* Main Answer Section - Prominently displayed */}
                        <div ref={messageRef} className="w-full space-y-4">
                            {sanitizedImageResult && (
                                <ImageGenerationResult result={sanitizedImageResult} />
                            )}

                            {hasAnswer && (
                                <div className="flex flex-col">
                                    {/* Sources Grid */}
                                    <SourceGrid sources={threadItem.sources || []} />

                                    {/* Main Answer - Prominently displayed with clear contrast from thinking */}
                                    <div className="relative">
                                        <MarkdownContent
                                            content={displayAnswer || ''}
                                            key={`answer-${threadItem.id}`}
                                            isCompleted={isFinalStatus}
                                            shouldAnimate={
                                                !['COMPLETED', 'ERROR', 'ABORTED'].includes(
                                                    threadItem.status || ''
                                                )
                                            }
                                            isLast={isLast}
                                            className="prose-slate dark:prose-invert max-w-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <QuestionPrompt threadItem={threadItem} />
                        {threadItem.error && (
                            <Alert variant="destructive">
                                <AlertDescription>
                                    <IconAlertCircle className="mt-0.5 size-3.5" />
                                    {typeof threadItem.error === 'string'
                                        ? threadItem.error
                                        : 'Something went wrong while processing your request. Please try again.'}
                                </AlertDescription>
                            </Alert>
                        )}

                        {threadItem.status === 'ABORTED' && (
                            <Alert variant="warning">
                                <AlertDescription>
                                    <IconAlertCircle className="mt-0.5 size-3.5" />
                                    {threadItem.error ?? 'Generation stopped'}
                                </AlertDescription>
                            </Alert>
                        )}

                        {isAnimationComplete &&
                            (threadItem.status === 'COMPLETED' ||
                                threadItem.status === 'ABORTED' ||
                                threadItem.status === 'ERROR' ||
                                !isGenerating) && (
                                <MessageActions
                                    threadItem={threadItem}
                                    ref={messageRef}
                                    isLast={isLast}
                                />
                            )}
                        {isAnimationComplete && isLast && (
                            <FollowupSuggestions suggestions={threadItem.suggestions || []} />
                        )}
                    </div>
                </div>
            </CitationProvider>
        );
    },
    (prevProps, nextProps) => {
        return JSON.stringify(prevProps.threadItem) === JSON.stringify(nextProps.threadItem);
    }
);

ThreadItem.displayName = 'ThreadItem';
