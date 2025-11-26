'use client';
import { useChatStore } from '../../../store';
import { ThreadItem } from '@repo/shared/types';
import { Button, cn } from '@repo/ui';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useMemo, useCallback, useEffect, useRef } from 'react';

interface BranchNavigationProps {
    threadItem: ThreadItem;
    className?: string;
}

export function BranchNavigation({ threadItem, className }: BranchNavigationProps) {
    const threadItems = useChatStore(state => state.threadItems);
    const setCurrentThreadItem = useChatStore(state => state.setCurrentThreadItem);
    const lastNavigatedIdRef = useRef<string | null>(null);

    // Get all items in the same branch group
    const branchGroup = useMemo(() => {
        if (!threadItem.branchGroupId && !threadItem.branchParentId) {
            return [];
        }

        const groupId = threadItem.branchGroupId || threadItem.branchParentId;
        
        // Find all items that share this branch group
        const branches = threadItems.filter((item: ThreadItem) => 
            item.branchGroupId === groupId || 
            item.branchParentId === groupId ||
            item.id === groupId
        );

        // Sort by branch index, falling back to createdAt
        return branches.sort((a: ThreadItem, b: ThreadItem) => {
            if (typeof a.branchIndex === 'number' && typeof b.branchIndex === 'number') {
                return a.branchIndex - b.branchIndex;
            }
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
    }, [threadItem, threadItems]);

    // Find current position in the branch group
    const currentIndex = useMemo(() => {
        return branchGroup.findIndex((item: ThreadItem) => item.id === threadItem.id);
    }, [branchGroup, threadItem.id]);

    const totalBranches = branchGroup.length;

    // Scroll to bottom after branch navigation
    useEffect(() => {
        if (lastNavigatedIdRef.current && lastNavigatedIdRef.current === threadItem.id) {
            // Use requestAnimationFrame to ensure DOM has updated
            requestAnimationFrame(() => {
                const container = document.querySelector('.no-scrollbar');
                if (container) {
                    container.scrollTo({
                        top: container.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            });
            lastNavigatedIdRef.current = null;
        }
    }, [threadItem.id]);

    const navigateToBranch = useCallback((direction: 'prev' | 'next') => {
        if (branchGroup.length <= 1) return;

        const newIndex = direction === 'prev' 
            ? Math.max(0, currentIndex - 1)
            : Math.min(branchGroup.length - 1, currentIndex + 1);

        if (newIndex !== currentIndex && branchGroup[newIndex]) {
            const targetItem = branchGroup[newIndex];
            lastNavigatedIdRef.current = targetItem.id;
            setCurrentThreadItem(targetItem);
        }
    }, [branchGroup, currentIndex, setCurrentThreadItem]);

    // Don't show if there's only one or no branches
    if (totalBranches <= 1) {
        return null;
    }

    const canGoPrev = currentIndex > 0;
    const canGoNext = currentIndex < totalBranches - 1;

    return (
        <div className={cn('flex items-center gap-1', className)}>
            <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => navigateToBranch('prev')}
                disabled={!canGoPrev}
                tooltip="Previous version"
                className="h-6 w-6"
            >
                <IconChevronLeft size={14} strokeWidth={2} />
            </Button>
            
            <span className="min-w-[40px] text-center text-xs font-medium text-muted-foreground">
                {currentIndex + 1} / {totalBranches}
            </span>
            
            <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => navigateToBranch('next')}
                disabled={!canGoNext}
                tooltip="Next version"
                className="h-6 w-6"
            >
                <IconChevronRight size={14} strokeWidth={2} />
            </Button>
        </div>
    );
}
