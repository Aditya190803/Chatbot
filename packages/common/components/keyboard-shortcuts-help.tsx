'use client';

import { formatShortcut, getShortcutsByCategory, ShortcutDefinition } from '../hooks/use-keyboard-shortcuts';
import { cn, Badge } from '@repo/ui';
import { IconKeyboard } from '@tabler/icons-react';

export interface KeyboardShortcutsHelpProps {
    className?: string;
}

/**
 * Component to display all available keyboard shortcuts
 */
export function KeyboardShortcutsHelp({ className }: KeyboardShortcutsHelpProps) {
    const shortcutsByCategory = getShortcutsByCategory();
    
    const categoryLabels: Record<string, string> = {
        navigation: 'Navigation',
        chat: 'Chat',
        ui: 'Interface',
        editing: 'Editing',
    };
    
    return (
        <div className={cn('flex flex-col gap-4', className)}>
            <div className="flex items-center gap-2">
                <IconKeyboard size={20} className="text-muted-foreground" />
                <h3 className="text-base font-semibold">Keyboard Shortcuts</h3>
            </div>
            
            <div className="space-y-4">
                {Object.entries(shortcutsByCategory).map(([category, shortcuts]) => (
                    <div key={category} className="space-y-2">
                        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {categoryLabels[category] || category}
                        </h4>
                        <div className="space-y-1">
                            {shortcuts.map((shortcut, index) => (
                                <ShortcutRow key={`${shortcut.key}-${index}`} shortcut={shortcut} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

interface ShortcutRowProps {
    shortcut: ShortcutDefinition;
}

function ShortcutRow({ shortcut }: ShortcutRowProps) {
    const formattedShortcut = formatShortcut(shortcut);
    
    return (
        <div className="flex items-center justify-between gap-4 rounded-md px-2 py-1.5 hover:bg-muted/50">
            <span className="text-sm text-foreground">{shortcut.description}</span>
            <kbd className="inline-flex items-center gap-1 rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                {formattedShortcut}
            </kbd>
        </div>
    );
}

/**
 * Inline shortcut display component
 */
export function ShortcutBadge({ 
    shortcut, 
    className 
}: { 
    shortcut: ShortcutDefinition;
    className?: string;
}) {
    return (
        <Badge variant="secondary" className={cn('gap-1 font-mono text-xs', className)}>
            {formatShortcut(shortcut)}
        </Badge>
    );
}

/**
 * Small keyboard shortcut hint
 */
export function ShortcutHint({
    keys,
    className,
}: {
    keys: string[];
    className?: string;
}) {
    return (
        <div className={cn('flex items-center gap-0.5', className)}>
            {keys.map((key, index) => (
                <kbd
                    key={index}
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground"
                >
                    {key}
                </kbd>
            ))}
        </div>
    );
}
