'use client';
import { ChatModeOptions } from '@repo/common/components';
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
    IconChevronLeft,
    IconChevronRight,
    IconChevronDown,
} from '@tabler/icons-react';
import { forwardRef, useCallback, useEffect, useState } from 'react';
import { useBranchNavigation, BRANCH_NAV_BUTTON_CLASSES } from './branch-switcher';

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

        const {
            totalBranches,
            activeIndex: branchActiveIndex,
            branches,
            canShowPrevious: canNavigatePreviousBranch,
            canShowNext: canNavigateNextBranch,
            selectPrevious: navigatePreviousBranch,
            selectNext: navigateNextBranch,
            selectAtIndex: navigateBranchAtIndex,
        } = useBranchNavigation(threadItem);

    const branchDisplayIndex = branchActiveIndex >= 0 ? branchActiveIndex : 0;
        const showBranchControls = totalBranches > 1;
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
            <div className="flex flex-row items-center gap-1 py-2">
                {answerText && (
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
                )}

                {answerText && (
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
                )}

                {showBranchControls && (
                    <div className="flex items-center gap-1 pl-1">
                        <Button
                            variant="ghost-bordered"
                            size="icon-sm"
                            className={cn(BRANCH_NAV_BUTTON_CLASSES, !canNavigatePreviousBranch && 'opacity-40')}
                            disabled={!canNavigatePreviousBranch}
                            aria-label="Previous branch"
                            onClick={navigatePreviousBranch}
                            tooltip="Previous reply"
                        >
                            <IconChevronLeft size={14} strokeWidth={2} />
                        </Button>
                        <div className="flex flex-nowrap items-center gap-1">
                            {branches.map((branch, index) => {
                                const isActive = index === branchDisplayIndex;
                                const customLabel =
                                    branch.metadata &&
                                    typeof branch.metadata.branchLabel === 'string' &&
                                    branch.metadata.branchLabel.trim()?.length
                                        ? (branch.metadata.branchLabel as string)
                                        : null;
                                const label = customLabel ?? `<${index + 1}/${totalBranches}>`;

                                return (
                                    <Button
                                        key={branch.id}
                                        variant={isActive ? 'default' : 'ghost-bordered'}
                                        size="xs"
                                        rounded="full"
                                        className={cn(
                                            'h-6 min-w-[2.25rem] whitespace-nowrap px-2 text-xs font-medium',
                                            !isActive && 'border border-border/60 bg-background/80'
                                        )}
                                        aria-label={label}
                                        tooltip={label}
                                        onClick={() => navigateBranchAtIndex(index)}
                                    >
                                        {label}
                                    </Button>
                                );
                            })}
                        </div>
                        <Button
                            variant="ghost-bordered"
                            size="icon-sm"
                            className={cn(BRANCH_NAV_BUTTON_CLASSES, !canNavigateNextBranch && 'opacity-40')}
                            disabled={!canNavigateNextBranch}
                            aria-label="Next branch"
                            onClick={navigateNextBranch}
                            tooltip="Next reply"
                        >
                            <IconChevronRight size={14} strokeWidth={2} />
                        </Button>
                    </div>
                )}
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
                {threadItem.status === 'COMPLETED' && formattedTokensPerSecond && (
                    <p className="text-muted-foreground px-2 text-xs">
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
                    <p className="text-muted-foreground px-2 text-xs">
                        Generated with {getChatModeName(threadItem.mode)}
                    </p>
                )}
            </div>
        );
    }
);

MessageActions.displayName = 'MessageActions';
