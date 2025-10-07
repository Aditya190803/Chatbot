'use client';

import { useChatStore } from '@repo/common/store';
import { Thread } from '@repo/shared/types';
import { Button, Flex, Input, cn } from '@repo/ui';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export const HistoryItem = ({
    thread,
    dismiss,
    isActive,
    isPinned,
    pinThread,
    unpinThread,
}: {
    thread: Thread;
    dismiss: () => void;
    isActive?: boolean;
    isPinned?: boolean;
    pinThread: (threadId: string) => void;
    unpinThread: (threadId: string) => void;
}) => {
    const { push } = useRouter();
    const { threadId: currentThreadId } = useParams();
    const updateThread = useChatStore(state => state.updateThread);
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(thread.title);
    const deleteThread = useChatStore(state => state.deleteThread);
    const historyInputRef = useRef<HTMLInputElement>(null);
    const switchThread = useChatStore(state => state.switchThread);
    const [openOptions, setOpenOptions] = useState(false);
    const itemRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isEditing) {
            historyInputRef.current?.focus();
        }
    }, [isEditing]);

    useEffect(() => {
        if (!openOptions) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (itemRef.current && !itemRef.current.contains(event.target as Node)) {
                setOpenOptions(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [openOptions]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    const handleInputBlur = () => {
        setIsEditing(false);
        updateThread({
            id: thread.id,
            title: title?.trim() || 'Untitled',
        });
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            setIsEditing(false);
            updateThread({
                id: thread.id,
                title: title?.trim() || 'Untitled',
            });
        }
    };

    const containerClasses = cn(
        'gap-2 w-full group w-full relative flex flex-row items-center h-7 py-0.5 pl-2 pr-1 rounded-sm hover:bg-quaternary',
        isActive || isEditing ? 'bg-tertiary' : ''
    );

    const handleEditClick = () => {
        setIsEditing(true);
        setTimeout(() => {
            historyInputRef.current?.focus();
        }, 500);
    };

    const handleDeleteConfirm = () => {
        deleteThread(thread.id);
        if (currentThreadId === thread.id) {
            push('/chat');
        }
    };

    return (
        <div key={thread.id} className={containerClasses} ref={itemRef}>
            {isEditing ? (
                <Input
                    variant="ghost"
                    className="h-5 pl-0 text-xs"
                    ref={historyInputRef}
                    value={title || 'Untitled'}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    onBlur={handleInputBlur}
                />
            ) : (
                <Link
                    href={`/chat/${thread.id}`}
                    className="flex flex-1 items-center"
                    onClick={() => {
                        switchThread(thread.id);
                        dismiss();
                    }}
                >
                    <Flex
                        direction="col"
                        items="start"
                        className="flex-1 overflow-hidden"
                        gap="none"
                    >
                        <p className="hover:text-foreground line-clamp-1 w-full text-xs">
                            {thread.title}
                        </p>
                    </Flex>
                </Link>
            )}
            <div className="relative flex items-center">
                <Button
                    variant="ghost"
                    size="icon-xs"
                    className={cn(
                        'bg-quaternary h-6 w-6 rounded-md opacity-0 transition-opacity duration-150 group-hover:opacity-100',
                        openOptions && 'opacity-100'
                    )}
                    onClick={e => {
                        e.stopPropagation();
                        e.preventDefault();
                        setOpenOptions(!openOptions);
                    }}
                >
                    <MoreHorizontal
                        size={14}
                        strokeWidth="2"
                        className="text-muted-foreground/50"
                    />
                </Button>
                
                {openOptions && (
                    <div className="bg-background border-border absolute right-0 top-7 z-50 min-w-32 rounded-md border p-1 shadow-lg">
                        <button
                            onClick={e => {
                                e.stopPropagation();
                                handleEditClick();
                                setOpenOptions(false);
                            }}
                            className="hover:bg-muted w-full rounded-sm px-2 py-1 text-left text-sm transition-colors"
                        >
                            Rename
                        </button>
                        <button
                            onClick={e => {
                                e.stopPropagation();
                                handleDeleteConfirm();
                                setOpenOptions(false);
                            }}
                            className="hover:bg-muted w-full rounded-sm px-2 py-1 text-left text-sm transition-colors"
                        >
                            Delete Chat
                        </button>
                        {isPinned ? (
                            <button
                                onClick={() => {
                                    unpinThread(thread.id);
                                    setOpenOptions(false);
                                }}
                                className="hover:bg-muted w-full rounded-sm px-2 py-1 text-left text-sm transition-colors"
                            >
                                Unpin
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    pinThread(thread.id);
                                    setOpenOptions(false);
                                }}
                                className="hover:bg-muted w-full rounded-sm px-2 py-1 text-left text-sm transition-colors"
                            >
                                Pin
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
