'use client';
import { useRootContext } from '@repo/common/context';
import { useAppStore, useChatStore } from '@repo/common/store';
import type { Thread } from '@repo/shared/types';
import {
    cn,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    Input,
    Button,
    Kbd,
} from '@repo/ui';
import {
    IconCommand,
    IconKey,
    IconMessageCircleFilled,
    IconPlus,
    IconTrash,
    IconSearch,
} from '@tabler/icons-react';
import moment from 'moment';
import { useTheme } from 'next-themes';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export const CommandSearch = () => {
    const { threadId: currentThreadId } = useParams();
    const { isCommandSearchOpen, setIsCommandSearchOpen } = useRootContext();
    const threads = useChatStore(state => state.threads);
    const persistentThreads = useMemo(
        () => threads.filter((thread: Thread) => !thread.isTemporary),
        [threads]
    );
    const getThread = useChatStore(state => state.getThread);
    const removeThread = useChatStore(state => state.deleteThread);
    const switchThread = useChatStore(state => state.switchThread);
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const clearThreads = useChatStore(state => state.clearAllThreads);
    const setIsSettingsOpen = useAppStore(state => state.setIsSettingsOpen);
    const setSettingTab = useAppStore(state => state.setSettingTab);
    const [searchQuery, setSearchQuery] = useState('');
    const groupedThreads: Record<string, Thread[]> = {
        today: [],
        yesterday: [],
        last7Days: [],
        last30Days: [],
        previousMonths: [],
    };

    const groupsNames = {
        today: 'Today',
        yesterday: 'Yesterday',
        last7Days: 'Last 7 Days',
        last30Days: 'Last 30 Days',
        previousMonths: 'Previous Months',
    };

    persistentThreads.forEach((thread: Thread) => {
        const createdAt = moment(thread.createdAt);
        const now = moment();
        if (createdAt.isSame(now, 'day')) {
            groupedThreads.today.push(thread);
        } else if (createdAt.isSame(now.clone().subtract(1, 'day'), 'day')) {
            groupedThreads.yesterday.push(thread);
        } else if (createdAt.isAfter(now.clone().subtract(7, 'days'))) {
            groupedThreads.last7Days.push(thread);
        } else if (createdAt.isAfter(now.clone().subtract(30, 'days'))) {
            groupedThreads.last30Days.push(thread);
        } else {
            groupedThreads.previousMonths.push(thread);
        }
    });

    useEffect(() => {
        router.prefetch('/chat');
    }, [isCommandSearchOpen, persistentThreads, router]);

    useEffect(() => {
        if (isCommandSearchOpen) {
        }
    }, [isCommandSearchOpen]);

    const onClose = () => setIsCommandSearchOpen(false);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            // Cmd/Ctrl+K to open search
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsCommandSearchOpen(true);
            }
            // Alt+N for new thread (avoid browser's Ctrl+N new window)
            if (e.key === 'n' && e.altKey) {
                e.preventDefault();
                router.push('/chat');
            }
            // Escape to close when open
            if (e.key === 'Escape' && isCommandSearchOpen) {
                e.preventDefault();
                setIsCommandSearchOpen(false);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [isCommandSearchOpen, router, setIsCommandSearchOpen]);

    const actions = [
        {
            name: 'New Thread',
            icon: IconPlus,
            shortcut: 'Alt+N',
            action: () => {
                router.push('/chat');
                onClose();
            },
        },
        {
            name: 'Delete Thread',
            icon: IconTrash,
            action: async () => {
                const thread = await getThread(currentThreadId as string);
                if (thread) {
                    removeThread(thread.id);
                    router.push('/chat');
                    onClose();
                }
            },
        },
        {
            name: 'Use your own API key',
            icon: IconKey,
            action: () => {
                setIsSettingsOpen(true);
                setSettingTab('personalization');
                onClose();
            },
        },
        {
            name: 'Remove All Threads',
            icon: IconTrash,
            action: () => {
                clearThreads();
                router.push('/chat');
                onClose();
            },
        },
    ];

    // Filter threads and actions based on search
    const filteredThreads = persistentThreads.filter((thread: Thread) =>
        thread.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredActions = actions.filter(action =>
        action.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            {isCommandSearchOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-background border-border w-full max-w-2xl rounded-lg border p-6 shadow-lg">
                        <div className="flex items-center gap-2 mb-4">
                            <IconSearch size={20} />
                            <h2 className="text-lg font-semibold">Search</h2>
                            <div className="flex shrink-0 items-center gap-1 ml-auto">
                                <Kbd className="h-5 w-5">
                                    <IconCommand size={12} strokeWidth={2} className="shrink-0" />
                                </Kbd>
                                <Kbd className="h-5 w-5">K</Kbd>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsCommandSearchOpen(false)}
                                className="ml-2"
                            >
                                ×
                            </Button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="relative">
                                <IconSearch size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search threads and actions..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            <div className="max-h-96 overflow-y-auto space-y-4">
                                {/* Actions */}
                                {filteredActions.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Actions</h3>
                                        <div className="space-y-1">
                                            {filteredActions.map(action => (
                                                <Button
                                                    key={action.name}
                                                    variant="ghost"
                                                    className="w-full justify-start gap-3"
                                                    onClick={action.action}
                                                >
                                                    <action.icon
                                                        size={14}
                                                        strokeWidth="2"
                                                        className="text-muted-foreground flex-shrink-0"
                                                    />
                                                    <span className="flex-1 text-left">{action.name}</span>
                                                    {'shortcut' in action && action.shortcut && (
                                                        <span className="text-xs text-muted-foreground/60 ml-auto">
                                                            {action.shortcut}
                                                        </span>
                                                    )}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Threads */}
                                {filteredThreads.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Threads</h3>
                                        <div className="space-y-1">
                                            {filteredThreads.map((thread: Thread) => (
                                                <Button
                                                    key={thread.id}
                                                    variant="ghost"
                                                    className="w-full justify-start gap-3"
                                                    onClick={() => {
                                                        switchThread(thread.id);
                                                        router.push(`/chat/${thread.id}`);
                                                        onClose();
                                                    }}
                                                >
                                                    <IconMessageCircleFilled
                                                        size={16}
                                                        strokeWidth={2}
                                                        className="text-muted-foreground/50 flex-shrink-0"
                                                    />
                                                    <span className="w-full truncate text-left font-normal">
                                                        {thread.title}
                                                    </span>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {searchQuery && filteredActions.length === 0 && filteredThreads.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No results found for "{searchQuery}"
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
