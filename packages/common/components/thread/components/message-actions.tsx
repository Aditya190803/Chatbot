'use client';
import { BranchSwitcher, ChatModeOptions } from '@repo/common/components';
import { useAgentStream, useCopyText } from '@repo/common/hooks';
import { useChatStore } from '@repo/common/store';
import { ChatMode, getChatModeName } from '@repo/shared/config';
import { ThreadItem } from '@repo/shared/types';
import { Button, cn } from '@repo/ui';
import * as DropdownMenuComponents from '@repo/ui/src/components/dropdown-menu';
import {
    IconCheck,
    IconCopy,
    IconMarkdown,
    IconRefresh,
    IconTrash,
    IconChevronDown,
} from '@tabler/icons-react';
import { forwardRef, useCallback, useEffect, useState } from 'react';

const { DropdownMenu, DropdownMenuTrigger } = DropdownMenuComponents as typeof import('@repo/ui/src/components/dropdown-menu');
type MessageActionsProps = {
    threadItem: ThreadItem;
    isLast: boolean;
};

export const MessageActions = forwardRef<HTMLDivElement, MessageActionsProps>(
    ({ threadItem, isLast }, ref) => {
        const { handleSubmit } = useAgentStream();
        const removeThreadItem = useChatStore(state => state.deleteThreadItem);
        const getConversationThreadItems = useChatStore(
            state => state.getConversationThreadItems
        );
        const useWebSearch = useChatStore(state => state.useWebSearch);
    const [chatMode, setChatMode] = useState<ChatMode>(threadItem.mode);
        const { copyToClipboard, status, copyMarkdown, markdownCopyStatus } = useCopyText();
        const answerText =
            threadItem.answer?.text?.trim()?.length
                ? threadItem.answer?.text
                : threadItem.answer?.finalText;
        const tokensUsed = threadItem.tokensUsed ?? 0;
        const durationSeconds =
            typeof threadItem.generationDurationMs === 'number' &&
            threadItem.generationDurationMs > 0
                ? threadItem.generationDurationMs / 1000
                : null;
        const tokensPerSecond =
            durationSeconds && tokensUsed > 0 ? tokensUsed / durationSeconds : null;
        const formattedTokensPerSecond =
            tokensPerSecond !== null
                ? tokensPerSecond >= 100
                    ? `${Math.round(tokensPerSecond).toLocaleString()} tok/s`
                    : `${tokensPerSecond.toFixed(1)} tok/s`
                : null;

        const canRewrite = Boolean(threadItem.query?.trim()?.length);

        useEffect(() => {
            setChatMode(threadItem.mode);
        }, [threadItem.mode]);

        const submitRewrite = useCallback(
            async (mode: ChatMode) => {
                if (!threadItem.query?.trim()) {
                    return;
                }

                setChatMode(mode);

                const formData = new FormData();
                formData.append('query', threadItem.query);
                if (threadItem.imageAttachment) {
                    formData.append('imageAttachment', threadItem.imageAttachment);
                }

                const threadItems = getConversationThreadItems(threadItem.threadId);

                await handleSubmit({
                    formData,
                    existingThreadItemId: threadItem.id,
                    newChatMode: mode as any,
                    messages: threadItems,
                    useWebSearch: useWebSearch,
                    branchParentId: threadItem.id,
                });
            },
            [
                getConversationThreadItems,
                handleSubmit,
                threadItem.id,
                threadItem.imageAttachment,
                threadItem.query,
                threadItem.threadId,
                useWebSearch,
            ]
        );

        return (
            <div className="flex w-full flex-col items-start gap-2">
                <div className="flex w-full flex-row items-center gap-2 py-2">
                {/* Copy actions */}
                {answerText && (
                    <>
                        <Button
                            variant="ghost-bordered"
                            size="icon-sm"
                            onClick={() => {
                                if (ref && 'current' in ref && ref.current) {
                                    copyToClipboard(ref.current || '');
                                }
                            }}
                            tooltip="Copy"
                        >
                            {status === 'copied' ? (
                                <IconCheck size={16} strokeWidth={2} />
                            ) : (
                                <IconCopy size={16} strokeWidth={2} />
                            )}
                        </Button>

                        <Button
                            variant="ghost-bordered"
                            size="icon-sm"
                            onClick={() => {
                                copyMarkdown(
                                    `${answerText}\n\n## References\n${threadItem?.sources
                                        ?.map(source => `[${source.index}] ${source.link}`)
                                        .join('\n')}`
                                );
                            }}
                            tooltip="Copy Markdown"
                        >
                            {markdownCopyStatus === 'copied' ? (
                                <IconCheck size={16} strokeWidth={2} />
                            ) : (
                                <IconMarkdown size={16} strokeWidth={2} />
                            )}
                        </Button>
                    </>
                )}

                {/* Rewrite button with dropdown */}
                {threadItem.status !== 'ERROR' && threadItem.answer?.status !== 'HUMAN_REVIEW' && (
                    <div className="flex items-center">
                        <Button
                            variant="ghost-bordered"
                            size="icon-sm"
                            tooltip="Rewrite"
                            onClick={() => void submitRewrite(chatMode)}
                            disabled={!canRewrite}
                            className="rounded-r-none border-r-0"
                        >
                            <IconRefresh size={16} strokeWidth={2} />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost-bordered"
                                    size="icon-sm"
                                    tooltip="Rewrite options"
                                    disabled={!canRewrite}
                                    className="rounded-l-none"
                                >
                                    <IconChevronDown size={14} strokeWidth={2} />
                                </Button>
                            </DropdownMenuTrigger>
                            <ChatModeOptions chatMode={chatMode} isRetry setChatMode={submitRewrite} />
                        </DropdownMenu>
                    </div>
                )}

                {/* Delete button */}
                {isLast && (
                    <Button
                        variant="ghost-bordered"
                        size="icon-sm"
                        onClick={() => {
                            removeThreadItem(threadItem.id);
                        }}
                        tooltip="Remove"
                    >
                        <IconTrash size={16} strokeWidth={2} />
                    </Button>
                )}

                {/* Metadata info */}
                <div className="ml-auto flex items-center gap-2">
                    {threadItem.status === 'COMPLETED' && formattedTokensPerSecond && (
                        <p className="text-muted-foreground text-xs">
                            {tokensUsed > 0 && (
                                <>
                                    {tokensUsed.toLocaleString()} tokens
                                    <span className="mx-1">·</span>
                                </>
                            )}
                            {formattedTokensPerSecond}
                        </p>
                    )}
                    {threadItem.mode && (
                        <p className="text-muted-foreground text-xs">
                            {getChatModeName(threadItem.mode)}
                        </p>
                    )}
                </div>
                </div>

                <BranchSwitcher threadItem={threadItem} />
            </div>
        );
    }
);

MessageActions.displayName = 'MessageActions';
