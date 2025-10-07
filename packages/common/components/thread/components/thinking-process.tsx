import { useEffect, useId, useMemo, useState } from 'react';
import { IconChevronDown, IconBrain } from '@tabler/icons-react';
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
                    return <strong key={i} className="font-semibold text-foreground/95">{boldText}</strong>;
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
                        <span className="font-semibold text-foreground/90 shrink-0">{numberedMatch[1]}.</span>
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
                    <div key={`bullet-${index}`} className="mb-2 ml-6 flex gap-2">
                        <span className="text-foreground/70 shrink-0">•</span>
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
                    <div key={`header-${index}`} className="mb-2 mt-4 font-semibold text-foreground/90">
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
        <div className="group mb-3 rounded-lg border border-border/40 bg-muted/20 transition-colors hover:border-border/60 hover:bg-muted/30">
            <button
                onClick={toggleExpansion}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors md:px-4"
                aria-expanded={isExpanded}
                aria-controls={contentId}
            >
                <IconBrain size={16} className="shrink-0 text-muted-foreground/70" />
                <span className="flex-1 text-xs font-medium text-muted-foreground md:text-sm">
                    Model thinking
                </span>
                {isGenerating && !isAnswerReady && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                        Active
                    </span>
                )}
                <IconChevronDown
                    size={16}
                    className={cn(
                        'shrink-0 text-muted-foreground/70 transition-transform duration-200',
                        isExpanded && 'rotate-180'
                    )}
                />
            </button>

            <div
                id={contentId}
                className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    isExpanded ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0'
                )}
                aria-live={isGenerating ? 'polite' : 'off'}
                role="region"
            >
                <div className="border-t border-border/40 px-3 py-3 md:px-4 md:py-4">
                    <div className="max-h-[60vh] overflow-y-auto text-[13px] leading-relaxed text-muted-foreground">
                        {formattedContent}
                    </div>
                </div>
            </div>
        </div>
    );
}