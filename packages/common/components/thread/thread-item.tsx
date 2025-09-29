import {
    CitationProvider,
    FollowupSuggestions,
    MarkdownContent,
    Message,
    MessageActions,
    MotionSkeleton,
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
import { IconAlertCircle, IconBook, IconBrain } from '@tabler/icons-react';
import { memo, useEffect, useMemo, useRef } from 'react';
import { useInView } from 'react-intersection-observer';

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
        const { isAnimationComplete, text: animatedText } = useAnimatedText(
            threadItem.answer?.text || '',
            isLast && isGenerating
        );
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
        }, [threadItem]);

        const hasAnswer = useMemo(() => {
            return threadItem.answer?.text && threadItem.answer?.text.length > 0;
        }, [threadItem.answer]);

        const hasResponse = useMemo(() => {
            return (
                !!threadItem?.steps ||
                !!threadItem?.answer?.text ||
                !!threadItem?.object ||
                !!threadItem?.error ||
                threadItem?.status === 'COMPLETED' ||
                threadItem?.status === 'ABORTED' ||
                threadItem?.status === 'ERROR'
            );
        }, [threadItem]);
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
                            <div className="flex w-full flex-col items-start gap-2 opacity-10">
                                <MotionSkeleton className="bg-muted-foreground/40 mb-2 h-4 !w-[100px] rounded-sm" />
                                <MotionSkeleton className="w-full bg-gradient-to-r" />
                                <MotionSkeleton className="w-[70%] bg-gradient-to-r" />
                                <MotionSkeleton className="w-[50%] bg-gradient-to-r" />
                            </div>
                        )}

                        {!hasResponse && (threadItem.status === 'PENDING' || threadItem.status === 'QUEUED') && (
                            <div className="text-muted-foreground/90 flex flex-row items-center gap-2 text-xs">
                                <DotSpinner />
                                <IconBrain size={16} className="animate-pulse text-amber-500" />
                                Thinking...
                            </div>
                        )}

                        {/* Display thinking process if available */}
                        <ThinkingProcess content={threadItem.thinkingProcess} />

                        {/* Main Answer Section - Prominently displayed */}
                        <div ref={messageRef} className="w-full">
                            {hasAnswer && threadItem.answer?.text && (
                                <div className="flex flex-col">
                                    {/* Sources Grid */}
                                    <SourceGrid sources={threadItem.sources || []} />

                                    {/* Main Answer - Enhanced with clear separation */}
                                    <div className="relative">
                                        {threadItem.thinkingProcess && (
                                            <div className="absolute -top-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-60" />
                                        )}
                                        <div className={cn(
                                            "rounded-lg bg-background/50 backdrop-blur-sm",
                                            threadItem.thinkingProcess && "mt-4 p-1 border border-border/20"
                                        )}>
                                            <MarkdownContent
                                                content={animatedText || ''}
                                                key={`answer-${threadItem.id}`}
                                                isCompleted={['COMPLETED', 'ERROR', 'ABORTED'].includes(
                                                    threadItem.status || ''
                                                )}
                                                shouldAnimate={
                                                    !['COMPLETED', 'ERROR', 'ABORTED'].includes(
                                                        threadItem.status || ''
                                                    )
                                                }
                                                isLast={isLast}
                                                className={cn(
                                                    "prose-slate dark:prose-invert max-w-none",
                                                    threadItem.thinkingProcess && "p-4"
                                                )}
                                            />
                                        </div>
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
