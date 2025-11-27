'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Thread } from '@repo/shared/types';

export interface UsePaginatedThreadsOptions {
    threads: Thread[];
    pageSize?: number;
    initialPages?: number;
}

export interface UsePaginatedThreadsResult {
    displayedThreads: Thread[];
    hasMore: boolean;
    isLoading: boolean;
    loadMore: () => void;
    reset: () => void;
    totalCount: number;
    loadedCount: number;
}

/**
 * Hook for paginating thread history with infinite scroll support
 */
export function usePaginatedThreads(options: UsePaginatedThreadsOptions): UsePaginatedThreadsResult {
    const { threads, pageSize = 20, initialPages = 1 } = options;
    
    const [displayCount, setDisplayCount] = useState(pageSize * initialPages);
    const [isLoading, setIsLoading] = useState(false);
    
    // Sort threads by creation date (newest first)
    const sortedThreads = [...threads].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    const displayedThreads = sortedThreads.slice(0, displayCount);
    const hasMore = displayCount < sortedThreads.length;
    
    const loadMore = useCallback(() => {
        if (isLoading || !hasMore) return;
        
        setIsLoading(true);
        // Simulate async load (in case of future database pagination)
        setTimeout(() => {
            setDisplayCount(prev => Math.min(prev + pageSize, sortedThreads.length));
            setIsLoading(false);
        }, 100);
    }, [isLoading, hasMore, pageSize, sortedThreads.length]);
    
    const reset = useCallback(() => {
        setDisplayCount(pageSize * initialPages);
    }, [pageSize, initialPages]);
    
    // Reset when threads change significantly (e.g., search filter)
    useEffect(() => {
        if (threads.length < displayCount) {
            setDisplayCount(Math.max(pageSize * initialPages, threads.length));
        }
    }, [threads.length, displayCount, pageSize, initialPages]);
    
    return {
        displayedThreads,
        hasMore,
        isLoading,
        loadMore,
        reset,
        totalCount: sortedThreads.length,
        loadedCount: displayedThreads.length,
    };
}

export interface UseInfiniteScrollOptions {
    onLoadMore: () => void;
    hasMore: boolean;
    isLoading: boolean;
    threshold?: number;
    rootMargin?: string;
}

/**
 * Hook for infinite scroll functionality using Intersection Observer
 */
export function useInfiniteScroll(options: UseInfiniteScrollOptions) {
    const { onLoadMore, hasMore, isLoading, threshold = 0.1, rootMargin = '100px' } = options;
    
    const sentinelRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    
    useEffect(() => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }
        
        if (!hasMore || isLoading) return;
        
        observerRef.current = new IntersectionObserver(
            entries => {
                const [entry] = entries;
                if (entry.isIntersecting && hasMore && !isLoading) {
                    onLoadMore();
                }
            },
            {
                threshold,
                rootMargin,
            }
        );
        
        if (sentinelRef.current) {
            observerRef.current.observe(sentinelRef.current);
        }
        
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [onLoadMore, hasMore, isLoading, threshold, rootMargin]);
    
    return { sentinelRef };
}

/**
 * Group threads by date periods
 */
export function groupThreadsByDate(threads: Thread[]): Record<string, Thread[]> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const groups: Record<string, Thread[]> = {
        today: [],
        yesterday: [],
        last7Days: [],
        last30Days: [],
        older: [],
    };
    
    for (const thread of threads) {
        const createdAt = new Date(thread.createdAt);
        
        if (createdAt >= today) {
            groups.today.push(thread);
        } else if (createdAt >= yesterday) {
            groups.yesterday.push(thread);
        } else if (createdAt >= last7Days) {
            groups.last7Days.push(thread);
        } else if (createdAt >= last30Days) {
            groups.last30Days.push(thread);
        } else {
            groups.older.push(thread);
        }
    }
    
    return groups;
}
