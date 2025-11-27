'use client';

import { cn } from '@repo/ui';

export interface StreamingSkeletonProps {
    className?: string;
    showSteps?: boolean;
}

/**
 * Skeleton component displayed while waiting for initial streaming response
 */
export function StreamingSkeleton({ className, showSteps = true }: StreamingSkeletonProps) {
    return (
        <div className={cn('w-full space-y-4', className)}>
            {/* Steps skeleton */}
            {showSteps && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
                        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="ml-6 space-y-2">
                        <div className="h-3 w-3/4 animate-pulse rounded bg-muted/60" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-muted/60" />
                    </div>
                </div>
            )}

            {/* Answer skeleton */}
            <div className="space-y-3">
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
                <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </div>
        </div>
    );
}

/**
 * Pulse dot animation for loading state
 * (Named LoadingDots to avoid conflict with existing DotSpinner in thread module)
 */
export function LoadingDots({ className }: { className?: string }) {
    return (
        <div className={cn('flex items-center gap-1', className)}>
            <div
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: '0ms' }}
            />
            <div
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: '150ms' }}
            />
            <div
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: '300ms' }}
            />
        </div>
    );
}

/**
 * Typing indicator animation
 */
export function TypingIndicator({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                'inline-flex items-center gap-1 rounded-full bg-muted/50 px-3 py-2',
                className
            )}
        >
            <span className="text-xs text-muted-foreground">AI is typing</span>
            <LoadingDots />
        </div>
    );
}

/**
 * Full response skeleton with header
 */
export function ResponseSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn('border-border/40 bg-background/80 relative overflow-hidden rounded-xl border px-4 py-4 shadow-subtle-sm backdrop-blur-sm dark:border-border/30 dark:bg-background/60', className)}>
            {/* Animated gradient overlay */}
            <div className="bg-primary/5 pointer-events-none absolute inset-0 animate-pulse" aria-hidden />
            
            <div className="relative flex items-center gap-3 mb-4">
                <div className="border-border/50 bg-background/90 flex h-10 w-10 items-center justify-center rounded-full border shadow-inner">
                    <LoadingDots />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">
                        Generating response…
                    </span>
                    <span className="text-xs text-muted-foreground">
                        The assistant is processing your request
                    </span>
                </div>
            </div>
            
            <StreamingSkeleton showSteps={false} />
        </div>
    );
}
