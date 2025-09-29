'use client';
import { useChatStore } from '@repo/common/store';
import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Input,
} from '@repo/ui';
import { IconClock, IconPlus, IconSearch } from '@tabler/icons-react';
import { MoreHorizontal } from 'lucide-react';
import moment from 'moment';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function ThreadsPage() {
    const threads = useChatStore(state => state.threads);
    const updateThread = useChatStore(state => state.updateThread);
    const deleteThread = useChatStore(state => state.deleteThread);
    const switchThread = useChatStore(state => state.switchThread);
    const { push } = useRouter();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter threads based on search query
    const filteredThreads = threads.filter(thread =>
        thread.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingId]);

    const handleEditClick = (threadId: string, threadTitle: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(threadId);
        setTitle(threadTitle);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    const handleInputBlur = () => {
        if (editingId) {
            updateThread({
                id: editingId,
                title: title?.trim() || 'Untitled',
            });
            setEditingId(null);
        }
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && editingId) {
            updateThread({
                id: editingId,
                title: title?.trim() || 'Untitled',
            });
            setEditingId(null);
        }
    };

    const handleDeleteThread = (threadId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        deleteThread(threadId);
    };

    const handleThreadClick = (threadId: string) => {
        push(`/chat/${threadId}`);
        switchThread(threadId);
    };

    return (
        <div className="flex w-full flex-col gap-2">
            <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-2 pt-16">
                <h3 className="font-clash text-brand text-2xl font-semibold tracking-wide">
                    Chat History
                </h3>
                <div className="bg-secondary w-full rounded-md">
                    <div className="relative">
                        <IconSearch size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
                        <Input
                            placeholder="Search threads..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-tertiary h-10 w-full rounded-sm pl-10"
                        />
                    </div>

                    <div className="mt-2 space-y-2">
                        {filteredThreads?.length > 0 ? (
                            filteredThreads.map(thread => (
                                <div key={thread.id} className="mb-2">
                                    <div
                                        className="bg-tertiary hover:bg-quaternary group relative flex w-full cursor-pointer flex-col items-start rounded-md p-4 transition-all duration-200"
                                        onClick={() => handleThreadClick(thread.id)}
                                    >
                                        <div className="flex w-full justify-between">
                                            <div className="flex flex-col items-start gap-1">
                                                {editingId === thread.id ? (
                                                    <input
                                                        ref={inputRef}
                                                        value={title}
                                                        onChange={handleInputChange}
                                                        onBlur={handleInputBlur}
                                                        onKeyDown={handleInputKeyDown}
                                                        className="bg-quaternary rounded px-2 py-1 text-sm"
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <p className="line-clamp-2 w-full text-sm font-medium">
                                                        {thread.title}
                                                    </p>
                                                )}
                                                <p className="text-muted-foreground/50 flex flex-row items-center gap-1 text-xs">
                                                    <IconClock size={12} strokeWidth="2" />
                                                    {moment(thread.createdAt).fromNow()}
                                                </p>
                                            </div>

                                            <div className="relative">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    className="shrink-0"
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        // Simple dropdown alternative - you can implement a proper one later
                                                        const action = window.confirm('Choose action:\nOK = Rename, Cancel = Delete');
                                                        if (action) {
                                                            handleEditClick(thread.id, thread.title, e);
                                                        } else {
                                                            handleDeleteThread(thread.id, e);
                                                        }
                                                    }}
                                                >
                                                    <MoreHorizontal
                                                        size={14}
                                                        strokeWidth="2"
                                                        className="text-muted-foreground/50"
                                                    />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="border-hard mt-2 flex w-full flex-col items-center justify-center gap-4 rounded-md border border-dashed p-4">
                                <div className="flex flex-col items-center gap-0">
                                    <p className="text-muted-foreground text-sm">
                                        {searchQuery ? 'No threads found matching your search' : 'No threads found'}
                                    </p>
                                    <p className="text-muted-foreground/70 mt-1 text-xs">
                                        Start a new conversation to create a thread
                                    </p>
                                </div>
                                <Button variant="default" size="sm" onClick={() => push('/chat')}>
                                    <IconPlus size={14} strokeWidth="2" />
                                    New Thread
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
