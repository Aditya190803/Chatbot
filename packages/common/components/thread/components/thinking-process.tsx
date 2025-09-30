import { useEffect, useId, useMemo, useState } from 'react';
import { IconChevronUp, IconBrain, IconCopy, IconCheck } from '@tabler/icons-react';
import { cn } from '@repo/ui';

interface ThinkingProcessProps {
    content?: string;
    isCollapsedByDefault?: boolean;
    showCopyButton?: boolean;
    isAnswerReady?: boolean;
    isGenerating?: boolean;
}

export function ThinkingProcess({ 
    content, 
    isCollapsedByDefault = true, 
    showCopyButton = true,
    isAnswerReady = false,
    isGenerating = false,
}: ThinkingProcessProps) {
    const sanitizedContent = useMemo(() => {
        if (!content) {
            return '';
        }

        return content
            .replace(/<\/?think>/gi, '')
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }, [content]);

    const shouldForceOpen = isGenerating || !isAnswerReady;
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [isExpanded, setIsExpanded] = useState(() => (shouldForceOpen ? true : !isCollapsedByDefault));
    const [isCopied, setIsCopied] = useState(false);
    const contentId = useId();

    if (!sanitizedContent) {
        return null;
    }

    useEffect(() => {
        if (!hasUserInteracted) {
            if (shouldForceOpen) {
                setIsExpanded(true);
            } else {
                setIsExpanded(!isCollapsedByDefault);
            }
        }
    }, [shouldForceOpen, hasUserInteracted, isCollapsedByDefault]);

    useEffect(() => {
        if (!isGenerating && isAnswerReady) {
            setHasUserInteracted(false);
            setIsExpanded(false);
        }
    }, [isGenerating, isAnswerReady]);

    const handleCopy = async () => {
        if (sanitizedContent) {
            try {
                await navigator.clipboard.writeText(sanitizedContent);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        }
    };

    // Get word count for better UX
    const { wordCount, readingTime } = useMemo(() => {
        const words = sanitizedContent.trim().split(/\s+/).filter(Boolean).length;
        return {
            wordCount: words,
            readingTime: Math.max(1, Math.ceil(words / 200)),
        };
    }, [sanitizedContent]);

    const toggleExpansion = () => {
        setHasUserInteracted(true);
        setIsExpanded(prev => !prev);
    };

    const summaryPill = (
        <span className="ml-3 rounded-full bg-muted/80 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
            {wordCount} words • {readingTime} min read
        </span>
    );

    return (
        <div className="mb-4 rounded-xl border border-border/50 bg-background/80 shadow-subtle-xs backdrop-blur-sm dark:border-border/40 dark:bg-background/30">
            <div className="flex w-full items-start gap-3 rounded-t-xl border-b border-border/40 px-4 py-3">
                <div className="flex flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 text-sm font-semibold text-muted-foreground">
                            <IconBrain size={16} className="shrink-0" />
                            <span>Model thinking</span>
                        </div>
                        <span className={cn(
                            'rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide',
                            shouldForceOpen
                                ? 'border-amber-500/50 bg-amber-50 text-amber-700 dark:border-amber-300/40 dark:bg-amber-400/10 dark:text-amber-200'
                                : 'border-border/60 bg-muted/70 text-muted-foreground/80 dark:border-border/50 dark:bg-muted/40'
                        )}>
                            {shouldForceOpen ? 'In progress' : 'Hidden by default'}
                        </span>
                        {summaryPill}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {showCopyButton && (
                        <button
                            onClick={() => {
                                handleCopy();
                            }}
                            type="button"
                            className="rounded-md border border-border/60 bg-muted/40 p-1.5 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground dark:border-border/50 dark:bg-muted/30"
                            title="Copy thinking"
                        >
                            {isCopied ? (
                                <IconCheck size={16} className="text-green-600 dark:text-green-400" />
                            ) : (
                                <IconCopy size={16} />
                            )}
                        </button>
                    )}
                    <button
                        onClick={toggleExpansion}
                        type="button"
                        className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted dark:border-border/50 dark:bg-background/60"
                        aria-expanded={isExpanded}
                        aria-controls={contentId}
                    >
                        {isExpanded ? 'Hide thinking' : 'Show thinking'}
                        <IconChevronUp
                            size={16}
                            className={cn('transition-transform', isExpanded ? 'rotate-0' : 'rotate-180')}
                        />
                    </button>
                </div>
            </div>

            <div
                id={contentId}
                className={cn(
                    'overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out',
                    isExpanded ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0'
                )}
                aria-live={isGenerating ? 'polite' : 'off'}
                role="region"
            >
                <div className="hide-scrollbar max-h-[60vh] overflow-y-auto px-4 py-5 text-[13px] leading-relaxed text-muted-foreground">
                    <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed tracking-tight text-muted-foreground/90">
                        {sanitizedContent}
                    </pre>
                </div>
            </div>
        </div>
    );
}