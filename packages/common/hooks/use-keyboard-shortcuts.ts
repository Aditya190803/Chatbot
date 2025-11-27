'use client';

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
    key: string;
    modifiers?: ('ctrl' | 'meta' | 'alt' | 'shift')[];
    description: string;
    category: 'navigation' | 'chat' | 'ui' | 'editing';
    action: () => void;
}

export interface UseKeyboardShortcutsOptions {
    enabled?: boolean;
    shortcuts: KeyboardShortcut[];
    onShortcutTriggered?: (shortcut: KeyboardShortcut) => void;
}

/**
 * Normalize keyboard event modifiers to a consistent format
 */
function getModifiers(event: KeyboardEvent): Set<string> {
    const modifiers = new Set<string>();
    if (event.ctrlKey) modifiers.add('ctrl');
    if (event.metaKey) modifiers.add('meta');
    if (event.altKey) modifiers.add('alt');
    if (event.shiftKey) modifiers.add('shift');
    return modifiers;
}

/**
 * Check if a keyboard event matches a shortcut definition
 */
function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    const eventModifiers = getModifiers(event);
    const shortcutModifiers = shortcut.modifiers || [];
    
    // Check if modifiers match exactly
    if (eventModifiers.size !== shortcutModifiers.length) return false;
    
    for (let i = 0; i < shortcutModifiers.length; i++) {
        if (!eventModifiers.has(shortcutModifiers[i])) return false;
    }
    
    // Check key (case insensitive)
    return event.key.toLowerCase() === shortcut.key.toLowerCase();
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: Pick<KeyboardShortcut, 'key' | 'modifiers'>): string {
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
    const parts: string[] = [];
    
    if (shortcut.modifiers) {
        for (const mod of shortcut.modifiers) {
            switch (mod) {
                case 'ctrl':
                    parts.push(isMac ? '⌃' : 'Ctrl');
                    break;
                case 'meta':
                    parts.push(isMac ? '⌘' : 'Win');
                    break;
                case 'alt':
                    parts.push(isMac ? '⌥' : 'Alt');
                    break;
                case 'shift':
                    parts.push(isMac ? '⇧' : 'Shift');
                    break;
            }
        }
    }
    
    // Format special keys
    let keyDisplay = shortcut.key;
    switch (shortcut.key.toLowerCase()) {
        case 'escape':
            keyDisplay = isMac ? '⎋' : 'Esc';
            break;
        case 'enter':
            keyDisplay = isMac ? '↵' : 'Enter';
            break;
        case 'arrowup':
            keyDisplay = '↑';
            break;
        case 'arrowdown':
            keyDisplay = '↓';
            break;
        case 'arrowleft':
            keyDisplay = '←';
            break;
        case 'arrowright':
            keyDisplay = '→';
            break;
        default:
            keyDisplay = shortcut.key.toUpperCase();
    }
    
    parts.push(keyDisplay);
    return parts.join(isMac ? '' : '+');
}

/**
 * Hook that registers and handles keyboard shortcuts
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
    const { enabled = true, shortcuts, onShortcutTriggered } = options;
    
    const shortcutsRef = useRef<KeyboardShortcut[]>(shortcuts);
    shortcutsRef.current = shortcuts;
    
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;
            
            // Don't trigger shortcuts when typing in inputs
            const target = event.target as HTMLElement;
            const isInput = ['INPUT', 'TEXTAREA'].includes(target.tagName);
            const isEditable = target.isContentEditable;
            
            // Allow Escape to work even in inputs
            if (event.key !== 'Escape' && (isInput || isEditable)) {
                // Only process Cmd/Ctrl + key shortcuts in inputs
                if (!event.metaKey && !event.ctrlKey) return;
            }
            
            for (const shortcut of shortcutsRef.current) {
                if (matchesShortcut(event, shortcut)) {
                    event.preventDefault();
                    shortcut.action();
                    onShortcutTriggered?.(shortcut);
                    return;
                }
            }
        },
        [enabled, onShortcutTriggered]
    );
    
    useEffect(() => {
        if (!enabled) return;
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown, enabled]);
    
    return {
        shortcuts,
        formatShortcut,
    };
}

/**
 * Shortcut definition without action (for documentation)
 */
export interface ShortcutDefinition {
    key: string;
    modifiers?: ('ctrl' | 'meta' | 'alt' | 'shift')[];
    description: string;
    category: 'navigation' | 'chat' | 'ui' | 'editing';
}

/**
 * Get default shortcuts documentation (without actions)
 */
export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
    { key: 'n', modifiers: ['alt'], description: 'New thread', category: 'navigation' },
    { key: 'k', modifiers: ['meta'], description: 'Open search', category: 'navigation' },
    { key: 'b', modifiers: ['meta'], description: 'Toggle sidebar', category: 'ui' },
    { key: ',', modifiers: ['meta'], description: 'Open settings', category: 'ui' },
    { key: 'Escape', modifiers: [], description: 'Close modal / Stop generation', category: 'ui' },
];

/**
 * Get shortcuts grouped by category for documentation
 */
export function getShortcutsByCategory(): Record<string, ShortcutDefinition[]> {
    return DEFAULT_SHORTCUTS.reduce(
        (acc, shortcut) => {
            if (!acc[shortcut.category]) {
                acc[shortcut.category] = [];
            }
            acc[shortcut.category].push(shortcut);
            return acc;
        },
        {} as Record<string, ShortcutDefinition[]>
    );
}
