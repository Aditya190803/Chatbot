import { useState } from 'react';
import { IconChevronDown, IconChevronRight, IconBrain } from '@tabler/icons-react';
import { cn } from '@repo/ui';

interface ThinkingProcessProps {
    content?: string;
    isCollapsedByDefault?: boolean;
}

export function ThinkingProcess({ content, isCollapsedByDefault = true }: ThinkingProcessProps) {
    const [isCollapsed, setIsCollapsed] = useState(isCollapsedByDefault);

    if (!content || content.trim().length === 0) {
        return null;
    }

    return (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex w-full items-center justify-between p-3 text-left hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg"
            >
                <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                    <IconBrain size={16} />
                    Model's Thought Process
                </div>
                {isCollapsed ? (
                    <IconChevronRight size={16} className="text-amber-600 dark:text-amber-400" />
                ) : (
                    <IconChevronDown size={16} className="text-amber-600 dark:text-amber-400" />
                )}
            </button>
            
            <div className={cn(
                "overflow-hidden transition-all duration-200 ease-in-out",
                isCollapsed ? "max-h-0" : "max-h-none"
            )}>
                <div className="border-t border-amber-200 dark:border-amber-800 p-3">
                    <div className="text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap font-mono">
                        {content}
                    </div>
                </div>
            </div>
        </div>
    );
}