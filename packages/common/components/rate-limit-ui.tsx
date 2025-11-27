'use client';

import { useState, useEffect } from 'react';
import { Button, cn } from '@repo/ui';
import { IconClock, IconRefresh } from '@tabler/icons-react';

export interface RateLimitExceededProps {
    retryAfterSeconds?: number;
    resetAt?: string;
    onRetry?: () => void;
    className?: string;
}

export function RateLimitExceeded({
    retryAfterSeconds,
    resetAt,
    onRetry,
    className,
}: RateLimitExceededProps) {
    const [countdown, setCountdown] = useState(retryAfterSeconds || 0);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (retryAfterSeconds) {
            setCountdown(retryAfterSeconds);
            setIsReady(false);
        } else if (resetAt) {
            const resetTime = new Date(resetAt).getTime();
            const now = Date.now();
            const diff = Math.max(0, Math.ceil((resetTime - now) / 1000));
            setCountdown(diff);
            setIsReady(diff <= 0);
        }
    }, [retryAfterSeconds, resetAt]);

    useEffect(() => {
        if (countdown <= 0) {
            setIsReady(true);
            return;
        }

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    setIsReady(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [countdown]);

    const formatTime = (seconds: number) => {
        if (seconds < 60) {
            return `${seconds}s`;
        }
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center gap-4 rounded-lg border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950/30',
                className
            )}
        >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                <IconClock size={24} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
                <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                    Slow Down
                </h3>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                    You&apos;ve made too many requests. Please wait before trying again.
                </p>
            </div>
            {countdown > 0 && (
                <div className="flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 dark:bg-amber-900/50">
                    <IconClock size={16} className="text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        Try again in {formatTime(countdown)}
                    </span>
                </div>
            )}
            {isReady && onRetry && (
                <Button onClick={onRetry} size="sm" className="gap-2">
                    <IconRefresh size={16} />
                    Try Again
                </Button>
            )}
        </div>
    );
}

export interface RateLimitBannerProps {
    remaining: number;
    limit: number;
    className?: string;
}

export function RateLimitBanner({ remaining, limit, className }: RateLimitBannerProps) {
    const percentage = (remaining / limit) * 100;
    const isLow = percentage <= 20;
    const isVeryLow = percentage <= 10;

    if (percentage > 20) return null;

    return (
        <div
            className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium',
                isVeryLow
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                    : isLow
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                      : '',
                className
            )}
        >
            <IconClock size={14} />
            <span>
                {remaining} request{remaining !== 1 ? 's' : ''} remaining
            </span>
        </div>
    );
}
