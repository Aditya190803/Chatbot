import { useState, useRef, useId } from 'react';
import {
    IconChevronDown,
    IconChevronRight,
    IconBrain,
    IconCopy,
    IconCheck,
    IconInfoCircle,
} from '@tabler/icons-react';
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
    const contentId = useId();

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
        <div className="mb-4 rounded-xl border border-amber-200/70 bg-amber-50/70 shadow-subtle-xs backdrop-blur-sm dark:border-amber-800/60 dark:bg-amber-950/30">
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex w-full items-center justify-between gap-3 rounded-t-xl px-4 py-3 text-left transition-colors duration-150 hover:bg-amber-100/70 dark:hover:bg-amber-900/40"
                aria-expanded={!isCollapsed}
                aria-controls={contentId}
            >
                <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-200">
                            <IconBrain size={16} className="shrink-0" />
                            <span>Thinking…</span>
                        </div>
                        <span className="rounded-full border border-amber-200/80 bg-white/70 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-600/80 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-400/80">
                            Not the final answer
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-amber-600/70 dark:text-amber-400/70">
                        <IconInfoCircle size={14} className="shrink-0" />
                        <span>{wordCount} words • {readingTime} min read • tap to expand</span>
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
                id={contentId}
                className={cn(
                    "overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out",
                    isCollapsed ? "max-h-0 opacity-0" : "max-h-[80vh] opacity-100"
                )}
            >
                <div className="border-t border-amber-200/60 bg-gradient-to-b from-amber-50/80 via-amber-50/40 to-transparent dark:border-amber-800/60 dark:from-amber-950/40 dark:via-amber-950/10">
                    <div 
                        ref={contentRef}
                        className="hide-scrollbar max-h-[70vh] overflow-y-auto px-4 py-5 text-[13px] leading-relaxed text-amber-900/90 dark:text-amber-100/90"
                        style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgb(245 158 11 / 0.3) transparent'
                        }}
                    >
                        <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] tracking-tight">
                            {content}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}