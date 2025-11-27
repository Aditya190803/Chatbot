import { useEffect, useId, useMemo, useState } from 'react';
import { IconChevronDown, IconBrain, IconCopy, IconCheck } from '@tabler/icons-react';
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

    const shouldForceOpen = isGenerating && !isAnswerReady;
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const contentId = useId();

    if (!sanitizedContent) {
        return null;
    }

    useEffect(() => {
        if (!hasUserInteracted && shouldForceOpen) {
            setIsExpanded(true);
        }
    }, [shouldForceOpen, hasUserInteracted]);

    useEffect(() => {
        if (!isGenerating && isAnswerReady && !hasUserInteracted) {
            setIsExpanded(false);
        }
    }, [isGenerating, isAnswerReady, hasUserInteracted]);

    const toggleExpansion = () => {
        setHasUserInteracted(true);
        setIsExpanded(prev => !prev);
    };

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(sanitizedContent);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            // Silently fail - user can try again
        }
    };

    // Format thinking content with proper structure
    const formattedContent = useMemo(() => {
        const lines = sanitizedContent.split('\n');
        const formatted: JSX.Element[] = [];
        let currentParagraph: string[] = [];
        
        // Helper function to render text with bold markdown
        const renderWithBold = (text: string) => {
            const parts = text.split(/(\*\*.*?\*\*)/g);
            return parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    const boldText = part.slice(2, -2);
                    return <strong key={i} className="font-semibold text-purple-700 dark:text-purple-300">{boldText}</strong>;
                }
                return part;
            });
        };
        
        const flushParagraph = (index: number) => {
            if (currentParagraph.length > 0) {
                const text = currentParagraph.join(' ').trim();
                if (text) {
                    formatted.push(
                        <div key={`para-${index}`} className="mb-3">
                            {renderWithBold(text)}
                        </div>
                    );
                }
                currentParagraph = [];
            }
        };
        
        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            
            // Empty line - flush current paragraph
            if (!trimmedLine) {
                flushParagraph(index);
                return;
            }
            
            // Detect numbered lists (1., 2., etc.)
            const numberedMatch = trimmedLine.match(/^(\d+)\.\s*(.+)/);
            if (numberedMatch) {
                flushParagraph(index);
                const content = numberedMatch[2].trim();
                formatted.push(
                    <div key={`num-${index}`} className="mb-2 flex gap-2">
                        <span className="font-semibold text-purple-600 dark:text-purple-400 shrink-0">{numberedMatch[1]}.</span>
                        <span className="flex-1">
                            {renderWithBold(content)}
                        </span>
                    </div>
                );
                return;
            }
            
            // Detect bullet points (*, -, •)
            const bulletMatch = trimmedLine.match(/^[*\-•]\s+(.+)/);
            if (bulletMatch) {
                flushParagraph(index);
                const content = bulletMatch[1].trim();
                formatted.push(
                    <div key={`bullet-${index}`} className="mb-2 ml-4 flex gap-2">
                        <span className="text-purple-500 dark:text-purple-400 shrink-0">•</span>
                        <span className="flex-1">
                            {renderWithBold(content)}
                        </span>
                    </div>
                );
                return;
            }
            
            // Detect headers (lines ending with :)
            if (trimmedLine.endsWith(':') && trimmedLine.length < 100) {
                flushParagraph(index);
                formatted.push(
                    <div key={`header-${index}`} className="mb-2 mt-4 font-semibold text-purple-700 dark:text-purple-300">
                        {renderWithBold(trimmedLine)}
                    </div>
                );
                return;
            }
            
            // Regular text - accumulate into paragraph
            currentParagraph.push(trimmedLine);
        });
        
        // Flush any remaining paragraph
        flushParagraph(lines.length);
        
        return formatted;
    }, [sanitizedContent]);

    return (
        <div className="group w-full mb-4 rounded-xl border border-purple-200/50 dark:border-purple-800/40 bg-gradient-to-br from-purple-50/80 via-purple-50/50 to-violet-50/30 dark:from-purple-950/30 dark:via-purple-950/20 dark:to-violet-950/10 transition-all duration-200 hover:border-purple-300/60 dark:hover:border-purple-700/50 shadow-sm">
            <div className="flex w-full items-center gap-2.5 px-4 py-3">
                <button
                    onClick={toggleExpansion}
                    type="button"
                    className="flex flex-1 items-center gap-2.5 text-left transition-colors"
                    aria-expanded={isExpanded}
                    aria-controls={contentId}
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50">
                        <IconBrain size={16} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-purple-800 dark:text-purple-200">
                        Model Reasoning
                    </span>
                    {isGenerating && !isAnswerReady && (
                        <span className="rounded-full bg-purple-100 dark:bg-purple-900/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300 animate-pulse">
                            Thinking…
                        </span>
                    )}
                    <IconChevronDown
                        size={18}
                        className={cn(
                            'shrink-0 text-purple-500 dark:text-purple-400 transition-transform duration-300',
                            isExpanded && 'rotate-180'
                        )}
                    />
                </button>
                {showCopyButton && isExpanded && (
                    <button
                        onClick={handleCopy}
                        type="button"
                        className="p-1.5 rounded-md hover:bg-purple-200/50 dark:hover:bg-purple-800/50 transition-colors"
                        title="Copy thinking process"
                    >
                        {isCopied ? (
                            <IconCheck size={14} className="text-green-600 dark:text-green-400" />
                        ) : (
                            <IconCopy size={14} className="text-purple-500 dark:text-purple-400" />
                        )}
                    </button>
                )}
            </div>

            <div
                id={contentId}
                className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    isExpanded ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0'
                )}
                aria-live={isGenerating ? 'polite' : 'off'}
                role="region"
            >
                <div className="border-t border-purple-200/40 dark:border-purple-800/30 px-4 py-4">
                    <div className="max-h-[60vh] overflow-y-auto text-[13px] leading-relaxed text-purple-900/80 dark:text-purple-100/70 font-mono">
                        {formattedContent}
                    </div>
                </div>
            </div>
        </div>
    );
}