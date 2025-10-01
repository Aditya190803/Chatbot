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
} from '@tabler/icons-react';
import { forwardRef, useState } from 'react';
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
            canShowPrevious: canNavigatePreviousBranch,
            canShowNext: canNavigateNextBranch,
            selectPrevious: navigatePreviousBranch,
            selectNext: navigateNextBranch,
        } = useBranchNavigation(threadItem);

        const branchDisplayIndex = branchActiveIndex >= 0 ? branchActiveIndex : 0;
        const showBranchControls = totalBranches > 1;

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
                        <span className="text-muted-foreground text-xs font-medium">{`<${branchDisplayIndex + 1}/${totalBranches}>`}</span>
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost-bordered" size="icon-sm" tooltip="Rewrite">
                                <IconRefresh size={16} strokeWidth={2} />
                            </Button>
                        </DropdownMenuTrigger>
                        <ChatModeOptions
                            chatMode={chatMode}
                            isRetry
                            setChatMode={async mode => {
                                setChatMode(mode);
                                const formData = new FormData();
                                formData.append('query', threadItem.query || '');
                                const threadItems = getConversationThreadItems(
                                    threadItem.threadId
                                );
                                handleSubmit({
                                    formData,
                                    existingThreadItemId: threadItem.id,
                                    newChatMode: mode as any,
                                    messages: threadItems,
                                    useWebSearch: useWebSearch,
                                    branchParentId: threadItem.id,
                                });
                            }}
                        />
                    </DropdownMenu>
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
