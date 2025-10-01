'use client';

import { useCallback, useEffect, useMemo } from 'react';
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
    canShowPrevious: boolean;
    canShowNext: boolean;
    selectPrevious: () => void;
    selectNext: () => void;
};

export const useBranchNavigation = (threadItem: ThreadItem): BranchNavigation => {
    const rootId = useMemo(
        () => threadItem.branchRootId || threadItem.id,
        [threadItem.branchRootId, threadItem.id]
    );

    const selectBranch = useChatStore(state => state.selectBranch);
    const threadItems = useChatStore(state => state.threadItems);

    const siblings = useMemo(
        () =>
            threadItems
                .filter(item => item.threadId === threadItem.threadId)
                .filter(item => (item.branchRootId || item.id) === rootId)
                .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
        [threadItems, threadItem.threadId, rootId]
    );

    const selectedBranchId = useChatStore(state => state.branchSelections[rootId]);

    const fallbackIndex = useMemo(
        () => siblings.findIndex(item => item.id === threadItem.id),
        [siblings, threadItem.id]
    );

    const activeIndex = useMemo(() => {
        if (siblings.length === 0) return -1;
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
        if (!siblings.length) return;
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
        if (!canShowPrevious) return;
        const target = siblings[activeIndex - 1];
        if (target) {
            selectBranch(rootId, target.id);
        }
    }, [activeIndex, canShowPrevious, rootId, selectBranch, siblings]);

    const selectNext = useCallback(() => {
        if (!canShowNext) return;
        const target = siblings[activeIndex + 1];
        if (target) {
            selectBranch(rootId, target.id);
        }
    }, [activeIndex, canShowNext, rootId, selectBranch, siblings]);

    const currentBranch = activeIndex >= 0 ? siblings[activeIndex] : undefined;

    return {
        totalBranches: siblings.length,
        activeIndex,
        currentBranch,
        canShowPrevious,
        canShowNext,
        selectPrevious,
        selectNext,
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
        canShowPrevious,
        canShowNext,
        selectPrevious,
        selectNext,
    } = useBranchNavigation(threadItem);

    if (totalBranches <= 1 || activeIndex < 0) {
        return null;
    }

    const displayIndex = Math.min(activeIndex, totalBranches - 1);
    const modeLabel = currentBranch ? getChatModeName(currentBranch.mode) : null;

    return (
        <div className="flex items-center gap-2 self-start rounded-full border border-border/60 bg-background/80 px-2 py-1 text-xs text-muted-foreground shadow-subtle-sm backdrop-blur">
            <span className="font-medium text-foreground">{`<${displayIndex + 1}/${totalBranches}>`}</span>
            <div className="flex items-center gap-1">
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
