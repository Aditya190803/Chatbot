'use client';

import { Button, cn } from '@repo/ui';
import { IconLoader2, IconChevronDown } from '@tabler/icons-react';

export interface LoadMoreButtonProps {
    onClick: () => void;
    isLoading: boolean;
    hasMore: boolean;
    loadedCount: number;
    totalCount: number;
    className?: string;
}

/**
 * Load more button for paginated lists
 */
export function LoadMoreButton({
    onClick,
    isLoading,
    hasMore,
    loadedCount,
    totalCount,
    className,
}: LoadMoreButtonProps) {
    if (!hasMore) return null;

    return (
        <div className={cn('flex flex-col items-center gap-2 py-4', className)}>
            <Button
                variant="ghost"
                size="sm"
                onClick={onClick}
                disabled={isLoading}
                className="gap-2"
            >
                {isLoading ? (
                    <>
                        <IconLoader2 size={16} className="animate-spin" />
                        Loading...
                    </>
                ) : (
                    <>
                        <IconChevronDown size={16} />
                        Load More
                    </>
                )}
            </Button>
            <span className="text-xs text-muted-foreground">
                Showing {loadedCount} of {totalCount}
            </span>
        </div>
    );
}

export interface InfiniteScrollSentinelProps {
    sentinelRef: React.RefObject<HTMLDivElement>;
    isLoading: boolean;
    hasMore: boolean;
    className?: string;
}

/**
 * Sentinel element for infinite scroll detection
 */
export function InfiniteScrollSentinel({
    sentinelRef,
    isLoading,
    hasMore,
    className,
}: InfiniteScrollSentinelProps) {
    return (
        <div
            ref={sentinelRef}
            className={cn('flex items-center justify-center py-4', className)}
        >
            {isLoading && hasMore && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconLoader2 size={16} className="animate-spin" />
                    Loading more...
                </div>
            )}
        </div>
    );
}

export interface PaginationInfoProps {
    loadedCount: number;
    totalCount: number;
    className?: string;
}

/**
 * Simple pagination info display
 */
export function PaginationInfo({ loadedCount, totalCount, className }: PaginationInfoProps) {
    if (loadedCount >= totalCount) return null;

    return (
        <div className={cn('text-center text-xs text-muted-foreground', className)}>
            Showing {loadedCount} of {totalCount} conversations
        </div>
    );
}
