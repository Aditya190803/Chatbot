'use client';

import { useChatStore } from '../store/chat.store';
import { Button, cn, Tooltip, Switch } from '@repo/ui';
import { IconGhost, IconCloud, IconCloudOff } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

export interface TemporaryChatToggleProps {
    className?: string;
    showLabel?: boolean;
}

/**
 * Toggle button for enabling/disabling temporary chat mode
 * Temporary chats are not persisted to the database or synced to cloud
 */
export function TemporaryChatToggle({ className, showLabel = false }: TemporaryChatToggleProps) {
    const temporaryThreadId = useChatStore(state => state.temporaryThreadId);
    const currentThreadId = useChatStore(state => state.currentThreadId);
    const startTemporaryThread = useChatStore(state => state.startTemporaryThread);
    const endTemporaryThread = useChatStore(state => state.endTemporaryThread);

    const isTemporary = temporaryThreadId !== null && currentThreadId === temporaryThreadId;

    const handleToggle = () => {
        if (isTemporary) {
            endTemporaryThread();
        } else {
            startTemporaryThread();
        }
    };

    return (
        <Tooltip
            content={
                isTemporary
                    ? "Temporary mode: This chat won't be saved"
                    : 'Click to start a temporary chat (not saved)'
            }
            side="bottom"
        >
            <Button
                variant={isTemporary ? 'secondary' : 'ghost'}
                size={showLabel ? 'sm' : 'icon-sm'}
                className={cn(
                    'gap-2',
                    isTemporary && 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800/70',
                    className
                )}
                onClick={handleToggle}
            >
                <IconGhost
                    size={16}
                    className={cn(
                        isTemporary ? 'text-slate-600 dark:text-slate-400' : 'text-muted-foreground'
                    )}
                />
                {showLabel && (
                    <span className={cn(isTemporary && 'text-slate-700 dark:text-slate-300')}>
                        {isTemporary ? 'Temporary' : 'Persistent'}
                    </span>
                )}
            </Button>
        </Tooltip>
    );
}

/**
 * Badge indicator showing if current chat is temporary
 */
export function TemporaryChatBadge({ className }: { className?: string }) {
    const temporaryThreadId = useChatStore(state => state.temporaryThreadId);
    const currentThreadId = useChatStore(state => state.currentThreadId);

    const isTemporary = temporaryThreadId !== null && currentThreadId === temporaryThreadId;

    if (!isTemporary) return null;

    return (
        <div
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800/50 dark:text-slate-300',
                className
            )}
        >
            <IconGhost size={14} />
            <span>Temporary Chat</span>
            <IconCloudOff size={12} className="opacity-60" />
        </div>
    );
}

/**
 * Switch component for temporary chat mode in settings
 */
export function TemporaryChatSwitch({ className }: { className?: string }) {
    const temporaryThreadId = useChatStore(state => state.temporaryThreadId);
    const currentThreadId = useChatStore(state => state.currentThreadId);
    const startTemporaryThread = useChatStore(state => state.startTemporaryThread);
    const endTemporaryThread = useChatStore(state => state.endTemporaryThread);

    const isTemporary = temporaryThreadId !== null && currentThreadId === temporaryThreadId;

    return (
        <div className={cn('flex items-center justify-between gap-4', className)}>
            <div className="flex flex-col">
                <label className="text-sm font-medium">Temporary Chat</label>
                <p className="text-xs text-muted-foreground">
                    Messages won&apos;t be saved or synced to cloud
                </p>
            </div>
            <Switch
                checked={isTemporary}
                onCheckedChange={checked => {
                    if (checked) {
                        startTemporaryThread();
                    } else {
                        endTemporaryThread();
                    }
                }}
            />
        </div>
    );
}

/**
 * Info banner showing temporary chat status
 */
export function TemporaryChatBanner({ className }: { className?: string }) {
    const { push } = useRouter();
    const temporaryThreadId = useChatStore(state => state.temporaryThreadId);
    const currentThreadId = useChatStore(state => state.currentThreadId);
    const endTemporaryThread = useChatStore(state => state.endTemporaryThread);

    const isTemporary = temporaryThreadId !== null && currentThreadId === temporaryThreadId;

    if (!isTemporary) return null;

    return (
        <div
            className={cn(
                'flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50',
                className
            )}
        >
            <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/70">
                    <IconGhost size={18} className="text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Temporary Chat Mode
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                        This conversation will be deleted when you leave or close the browser
                    </p>
                </div>
            </div>
            <Button
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50"
                onClick={() => {
                    endTemporaryThread();
                    push('/chat');
                }}
            >
                <IconCloud size={16} />
                Save Chat
            </Button>
        </div>
    );
}

/**
 * Compact inline indicator for temporary chat - shows in the top header bar
 */
export function TemporaryChatIndicator({ className }: { className?: string }) {
    const { push } = useRouter();
    const temporaryThreadId = useChatStore(state => state.temporaryThreadId);
    const currentThreadId = useChatStore(state => state.currentThreadId);
    const endTemporaryThread = useChatStore(state => state.endTemporaryThread);

    const isTemporary = temporaryThreadId !== null && currentThreadId === temporaryThreadId;

    if (!isTemporary) return null;

    return (
        <div
            className={cn(
                'flex items-center gap-2 text-sm',
                className
            )}
        >
            <IconGhost size={14} className="text-foreground/80 flex-shrink-0" />
            <span className="text-foreground/80">Temporary chat</span>
            <span className="text-foreground/50 hidden sm:inline">· Your messages won't be saved to history</span>
            <button
                onClick={() => {
                    endTemporaryThread();
                    push('/chat');
                }}
                className="ml-2 text-sm text-foreground/60 hover:text-foreground underline underline-offset-2"
            >
                Exit
            </button>
        </div>
    );
}

/**
 * Small indicator shown below the greeting for temporary chat mode
 * Shows as a subtle subtitle under the normal "Good afternoon" greeting
 */
export function TemporaryChatGreeting({ className }: { className?: string }) {
    const { push } = useRouter();
    const temporaryThreadId = useChatStore(state => state.temporaryThreadId);
    const currentThreadId = useChatStore(state => state.currentThreadId);
    const endTemporaryThread = useChatStore(state => state.endTemporaryThread);

    const isTemporary = temporaryThreadId !== null && currentThreadId === temporaryThreadId;

    if (!isTemporary) return null;

    return (
        <div className={cn('flex flex-col items-center gap-1 text-center', className)}>
            <p className="text-sm text-foreground/60 flex items-center gap-2">
                <IconGhost size={14} />
                <span>This is a temporary chat</span>
            </p>
            <p className="text-xs text-foreground/40 max-w-sm">
                Your conversation won't be saved to history. Close this tab or click Exit to end the session.
            </p>
            <button
                onClick={() => {
                    endTemporaryThread();
                    push('/chat');
                }}
                className="mt-1 text-xs text-foreground/50 hover:text-foreground underline underline-offset-2"
            >
                Switch to normal chat
            </button>
        </div>
    );
}
