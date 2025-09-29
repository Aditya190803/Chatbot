import { useState, useEffect, useRef } from 'react';
import { IconChevronDown, IconChevronRight, IconBrain, IconCopy, IconCheck } from '@tabler/icons-react';
import { cn } from '@repo/ui';

interface ThinkingProcessProps {
    content?: string;
    isCollapsedByDefault?: boolean;
    showCopyButton?: boolean;
}

export function ThinkingProcess({ 
    content, 
    isCollapsedByDefault = true, 
    showCopyButton = true 
}: ThinkingProcessProps) {
    const [isCollapsed, setIsCollapsed] = useState(isCollapsedByDefault);
    const [isCopied, setIsCopied] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    if (!content || content.trim().length === 0) {
        return null;
    }

    const handleCopy = async () => {
        if (content) {
            try {
                await navigator.clipboard.writeText(content);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        }
    };

    // Get word count for better UX
    const wordCount = content.trim().split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed

    return (
        <div className="mb-4 rounded-lg border border-amber-200/60 bg-amber-50/50 dark:border-amber-800/60 dark:bg-amber-950/20 shadow-sm">
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex w-full items-center justify-between p-3 text-left hover:bg-amber-100/80 dark:hover:bg-amber-900/40 rounded-t-lg transition-colors duration-150"
                aria-expanded={!isCollapsed}
                aria-controls="thinking-content"
            >
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                        <IconBrain size={16} className="shrink-0" />
                        <span>Model's Thought Process</span>
                    </div>
                    <div className="text-xs text-amber-600/70 dark:text-amber-400/70">
                        {wordCount} words • {readingTime} min read
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {showCopyButton && !isCollapsed && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCopy();
                            }}
                            className="p-1 hover:bg-amber-200/60 dark:hover:bg-amber-800/60 rounded transition-colors duration-150"
                            title="Copy thinking process"
                        >
                            {isCopied ? (
                                <IconCheck size={14} className="text-amber-600 dark:text-amber-400" />
                            ) : (
                                <IconCopy size={14} className="text-amber-600 dark:text-amber-400" />
                            )}
                        </button>
                    )}
                    {isCollapsed ? (
                        <IconChevronRight size={16} className="text-amber-600 dark:text-amber-400 transition-transform duration-150" />
                    ) : (
                        <IconChevronDown size={16} className="text-amber-600 dark:text-amber-400 transition-transform duration-150" />
                    )}
                </div>
            </button>
            
            <div 
                id="thinking-content"
                className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out",
                    isCollapsed ? "max-h-0 opacity-0" : "max-h-[80vh] opacity-100"
                )}
            >
                <div className="border-t border-amber-200/60 dark:border-amber-800/60">
                    <div 
                        ref={contentRef}
                        className="p-4 text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap font-mono leading-relaxed bg-amber-25 dark:bg-amber-950/10 max-h-[70vh] overflow-y-auto"
                        style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgb(245 158 11 / 0.3) transparent'
                        }}
                    >
                        {content}
                    </div>
                </div>
            </div>
        </div>
    );
}