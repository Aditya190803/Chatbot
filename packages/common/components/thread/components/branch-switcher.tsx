'use client';

import { useCallback, useEffect, useMemo, type KeyboardEvent } from 'react';
import { useChatStore } from '@repo/common/store';
import { ThreadItem } from '@repo/shared/types';
import { getChatModeName } from '@repo/shared/config';
import { Button, cn } from '@repo/ui';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

export const BRANCH_NAV_BUTTON_CLASSES =
    'h-6 w-6 rounded-full border border-border/60 bg-background/80 shadow-subtle-sm';

type BranchNavigation = {
    totalBranches: number;
    activeIndex: number;
    currentBranch?: ThreadItem;
    branches: ThreadItem[];
    canShowPrevious: boolean;
    canShowNext: boolean;
    selectPrevious: () => void;
    selectNext: () => void;
    selectAtIndex: (index: number) => void;
};

export const useBranchNavigation = (threadItem: ThreadItem | null): BranchNavigation => {
    const selectBranch = useChatStore(state => state.selectBranch);
    const threadItems = useChatStore(state => state.threadItems);

    const threadItemId = threadItem?.id ?? null;
    const threadItemThreadId = threadItem?.threadId ?? null;
    const threadItemBranchRootId = threadItem?.branchRootId ?? null;

    const rootId = useMemo(() => {
        if (!threadItemId) return null;
        return threadItemBranchRootId || threadItemId;
    }, [threadItemBranchRootId, threadItemId]);

    const siblings = useMemo(() => {
        if (!threadItemThreadId || !rootId) {
            return [] as ThreadItem[];
        }

        return threadItems
            .filter(item => item.threadId === threadItemThreadId)
            .filter(item => (item.branchRootId || item.id) === rootId)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }, [threadItems, threadItemThreadId, rootId]);

    const selectedBranchId = useChatStore(state => (rootId ? state.branchSelections[rootId] : undefined));

    const fallbackIndex = useMemo(() => {
        if (!threadItemId) {
            return -1;
        }

        return siblings.findIndex(item => item.id === threadItemId);
    }, [siblings, threadItemId]);

    const activeIndex = useMemo(() => {
        if (!siblings.length) return -1;
        if (selectedBranchId) {
            const index = siblings.findIndex(item => item.id === selectedBranchId);
            if (index !== -1) {
                return index;
            }
        }
        if (fallbackIndex !== -1) {
            return fallbackIndex;
        }
        return siblings.length - 1;
    }, [fallbackIndex, selectedBranchId, siblings]);

    useEffect(() => {
        if (!siblings.length || !rootId) return;
        if (activeIndex === -1) {
            const fallback = siblings[siblings.length - 1];
            if (fallback) {
                selectBranch(rootId, fallback.id);
            }
        }
    }, [activeIndex, rootId, selectBranch, siblings]);

    const canShowPrevious = activeIndex > 0;
    const canShowNext = activeIndex !== -1 && activeIndex < siblings.length - 1;

    const selectPrevious = useCallback(() => {
        if (!canShowPrevious || !rootId) return;
        const target = siblings[activeIndex - 1];
        if (target) {
            selectBranch(rootId, target.id);
        }
    }, [activeIndex, canShowPrevious, rootId, selectBranch, siblings]);

    const selectNext = useCallback(() => {
        if (!canShowNext || !rootId) return;
        const target = siblings[activeIndex + 1];
        if (target) {
            selectBranch(rootId, target.id);
        }
    }, [activeIndex, canShowNext, rootId, selectBranch, siblings]);

    const selectAtIndex = useCallback(
        (index: number) => {
            if (!rootId) return;
            const isValidIndex = index >= 0 && index < siblings.length;
            if (!isValidIndex) return;

            const target = siblings[index];
            if (target) {
                selectBranch(rootId, target.id);
            }
        },
        [rootId, selectBranch, siblings]
    );

    const currentBranch = activeIndex >= 0 ? siblings[activeIndex] : undefined;

    return {
        totalBranches: siblings.length,
        activeIndex,
        currentBranch,
        branches: siblings,
        canShowPrevious,
        canShowNext,
        selectPrevious,
        selectNext,
        selectAtIndex,
    };
};

type BranchSwitcherProps = {
    threadItem: ThreadItem;
};

export const BranchSwitcher = ({ threadItem }: BranchSwitcherProps) => {
    const {
        totalBranches,
        activeIndex,
        currentBranch,
        branches,
        canShowPrevious,
        canShowNext,
        selectPrevious,
        selectNext,
        selectAtIndex,
    } = useBranchNavigation(threadItem);

    if (totalBranches <= 1 || activeIndex < 0) {
        return null;
    }

    const displayIndex = Math.min(activeIndex, totalBranches - 1);
    const modeLabel = currentBranch ? getChatModeName(currentBranch.mode) : null;

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                selectPrevious();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                selectNext();
            } else if (event.key === 'Home') {
                event.preventDefault();
                selectAtIndex(0);
            } else if (event.key === 'End') {
                event.preventDefault();
                selectAtIndex(branches.length - 1);
            }
        },
        [branches.length, selectAtIndex, selectNext, selectPrevious]
    );

    return (
        <div
            className="flex items-center gap-2 self-start rounded-full border border-border/60 bg-background/80 px-2 py-1 text-xs text-muted-foreground shadow-subtle-sm backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-border/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            tabIndex={0}
            role="group"
            aria-label="Branch navigation"
            onKeyDown={handleKeyDown}
        >
            <div className="flex flex-nowrap items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className={cn(BRANCH_NAV_BUTTON_CLASSES, !canShowPrevious && 'opacity-40')}
                    disabled={!canShowPrevious}
                    aria-label="Previous branch"
                    onClick={selectPrevious}
                    tooltip="Previous reply"
                >
                    <IconChevronLeft size={14} strokeWidth={2} />
                </Button>
                <div className="flex flex-nowrap items-center gap-1">
                    {branches.map((branch, index) => {
                        const isActive = index === displayIndex;
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
                                variant={isActive ? 'default' : 'ghost'}
                                size="xs"
                                rounded="full"
                                className={cn(
                                    'h-6 min-w-[2.25rem] whitespace-nowrap px-2 text-xs font-medium',
                                    !isActive && 'border border-border/60 bg-background/80'
                                )}
                                aria-label={label}
                                tooltip={label}
                                onClick={() => selectAtIndex(index)}
                            >
                                {label}
                            </Button>
                        );
                    })}
                </div>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className={cn(BRANCH_NAV_BUTTON_CLASSES, !canShowNext && 'opacity-40')}
                    disabled={!canShowNext}
                    aria-label="Next branch"
                    onClick={selectNext}
                    tooltip="Next reply"
                >
                    <IconChevronRight size={14} strokeWidth={2} />
                </Button>
            </div>
            {modeLabel && (
                <span className="hidden pl-1 pr-1.5 text-[11px] font-medium text-muted-foreground/80 sm:inline">{modeLabel}</span>
            )}
        </div>
    );
};
