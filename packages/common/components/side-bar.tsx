'use client';
import React, { useState } from 'react';
import { useClerk, useUser } from '@clerk/nextjs';
import { FullPageLoader, HistoryItem, Logo } from '@repo/common/components';
import { useRootContext } from '@repo/common/context';
import { useAppStore, useChatStore } from '@repo/common/store';
import { Thread } from '@repo/shared/types';
import {
    Badge,
    Button,
    cn,
    Flex,
} from '@repo/ui';
import {
    IconArrowBarLeft,
    IconArrowBarRight,
    IconCommand,
    IconLogout,
    IconPinned,
    IconPlus,
    IconSearch,
    IconSelector,
    IconSettings,
    IconSettings2,
    IconUser,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import moment from 'moment';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';

const UserMenu: React.FC<{
    user: any;
    isSidebarOpen: boolean;
    setIsSettingsOpen: (open: boolean) => void;
    openUserProfile: () => void;
    signOut: () => void;
}> = ({ user, isSidebarOpen, setIsSettingsOpen, openUserProfile, signOut }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div className="relative">
            <div
                className={cn(
                    'hover:bg-quaternary bg-background shadow-subtle-xs flex w-full cursor-pointer flex-row items-center gap-3 rounded-lg px-2 py-1.5',
                    !isSidebarOpen && 'px-1.5'
                )}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
                <div className="bg-brand flex size-5 shrink-0 items-center justify-center rounded-full">
                    {user && user.hasImage ? (
                        <img
                            src={user?.imageUrl ?? ''}
                            width={0}
                            height={0}
                            className="size-full shrink-0 rounded-full"
                            alt={user?.fullName ?? ''}
                        />
                    ) : (
                        <IconUser
                            size={14}
                            strokeWidth={2}
                            className="text-background"
                        />
                    )}
                </div>

                {isSidebarOpen && (
                    <p className="line-clamp-1 flex-1 !text-sm font-medium">
                        {user?.fullName}
                    </p>
                )}
                {isSidebarOpen && (
                    <IconSelector
                        size={14}
                        strokeWidth={2}
                        className="text-muted-foreground"
                    />
                )}
            </div>
            
            {isMenuOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsMenuOpen(false)}
                    />
                    <div className="absolute left-0 right-0 z-50 mt-2 bg-white border rounded-lg shadow-lg p-1">
                        <button
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded"
                            onClick={() => {
                                setIsSettingsOpen(true);
                                setIsMenuOpen(false);
                            }}
                        >
                            <IconSettings size={16} strokeWidth={2} />
                            Settings
                        </button>
                        <button
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded"
                            onClick={() => {
                                openUserProfile();
                                setIsMenuOpen(false);
                            }}
                        >
                            <IconUser size={16} strokeWidth={2} />
                            Profile
                        </button>
                        <button
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded"
                            onClick={() => {
                                signOut();
                                setIsMenuOpen(false);
                            }}
                        >
                            <IconLogout size={16} strokeWidth={2} />
                            Logout
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export const Sidebar = () => {
    const { threadId: currentThreadId } = useParams();
    const pathname = usePathname();
    const { setIsCommandSearchOpen } = useRootContext();
    const isChatPage = pathname === '/chat';
    const threads = useChatStore(state => state.threads);
    const pinThread = useChatStore(state => state.pinThread);
    const unpinThread = useChatStore(state => state.unpinThread);
    const sortThreads = (threads: Thread[], sortBy: 'createdAt') => {
        return [...threads].sort((a, b) => moment(b[sortBy]).diff(moment(a[sortBy])));
    };

    const { isSignedIn, user } = useUser();
    const { openUserProfile, signOut, redirectToSignIn } = useClerk();
    const clearAllThreads = useChatStore(state => state.clearAllThreads);
    const setIsSidebarOpen = useAppStore(state => state.setIsSidebarOpen);
    const isSidebarOpen = useAppStore(state => state.isSidebarOpen);
    const setIsSettingsOpen = useAppStore(state => state.setIsSettingsOpen);
    const { push } = useRouter();
    const groupedThreads: Record<string, Thread[]> = {
        today: [],
        yesterday: [],
        last7Days: [],
        last30Days: [],
        previousMonths: [],
    };

    sortThreads(threads, 'createdAt')?.forEach(thread => {
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

        //TODO: Paginate these threads
    });

    const renderGroup = ({
        title,
        threads,

        groupIcon,
        renderEmptyState,
    }: {
        title: string;
        threads: Thread[];
        groupIcon?: React.ReactNode;
        renderEmptyState?: () => React.ReactNode;
    }) => {
        if (threads.length === 0 && !renderEmptyState) return null;
        return (
            <Flex direction="col" items="start" className="w-full gap-1.5">
                <div className="text-muted-foreground/70 flex w-full items-center gap-1 px-1.5 text-[11px] font-semibold uppercase tracking-wide">
                    {groupIcon}
                    {title}
                </div>
                {threads.length === 0 && renderEmptyState ? (
                    <div>{renderEmptyState()}</div>
                ) : (
                    <Flex
                        className="bg-background/70 border-border/40 w-full gap-0.5 rounded-md border px-1.5 py-1"
                        gap="none"
                        direction="col"
                    >
                        {threads.map(thread => (
                            <HistoryItem
                                thread={thread}
                                pinThread={() => pinThread(thread.id)}
                                unpinThread={() => unpinThread(thread.id)}
                                isPinned={thread.pinned}
                                key={thread.id}
                                dismiss={() => {
                                    setIsSidebarOpen(prev => false);
                                }}
                                isActive={thread.id === currentThreadId}
                            />
                        ))}
                    </Flex>
                )}
            </Flex>
        );
    };

    return (
        <div
            className={cn(
                'relative z-[50] flex h-[100dvh] flex-shrink-0 flex-col border-r border-border/70 bg-background/95 px-3 py-4 shadow-subtle-sm backdrop-blur transition-all duration-200',
                isSidebarOpen ? 'w-[260px]' : 'w-[60px] px-2'
            )}
        >
            <Flex direction="col" className="w-full flex-1 overflow-hidden" gap="md">
                <div className="flex w-full flex-row items-center justify-between gap-2">
                    <Link href="/chat" className="w-full">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            className={cn(
                                'flex h-8 w-full cursor-pointer items-center justify-start gap-1.5 px-4',
                                !isSidebarOpen && 'justify-center px-0'
                            )}
                        >
                            <Logo className="text-brand size-5" />
                            {isSidebarOpen && (
                                <p className="font-clash text-foreground text-lg font-bold tracking-wide">
                                    Chatbot
                                </p>
                            )}
                        </motion.div>
                    </Link>
                    {isSidebarOpen && (
                        <Button
                            variant="ghost"
                            tooltip="Close Sidebar"
                            tooltipSide="right"
                            size="icon-sm"
                            onClick={() => setIsSidebarOpen(prev => !prev)}
                            className={cn(!isSidebarOpen && 'mx-auto', 'mr-2')}
                        >
                            <IconArrowBarLeft size={16} strokeWidth={2} />
                        </Button>
                    )}
                </div>
                <Flex
                    direction="col"
                    className={cn(
                        'w-full gap-2',
                        isSidebarOpen ? 'items-stretch' : 'items-center justify-center'
                    )}
                >
                    {!isChatPage ? (
                        <Link href="/chat" className={isSidebarOpen ? 'w-full' : ''}>
                            <Button
                                size={isSidebarOpen ? 'sm' : 'icon-sm'}
                                variant="bordered"
                                rounded="lg"
                                tooltip={isSidebarOpen ? undefined : 'New Thread'}
                                tooltipSide="right"
                                className={cn(isSidebarOpen && 'relative w-full', 'justify-center')}
                            >
                                <IconPlus size={16} strokeWidth={2} className={cn(isSidebarOpen)} />
                                {isSidebarOpen && 'New'}
                            </Button>
                        </Link>
                    ) : (
                        <Button
                            size={isSidebarOpen ? 'sm' : 'icon-sm'}
                            variant="bordered"
                            rounded="lg"
                            tooltip={isSidebarOpen ? undefined : 'New Thread'}
                            tooltipSide="right"
                            className={cn(isSidebarOpen && 'relative w-full', 'justify-center')}
                        >
                            <IconPlus size={16} strokeWidth={2} className={cn(isSidebarOpen)} />
                            {isSidebarOpen && 'New Thread'}
                        </Button>
                    )}
                    <Button
                        size={isSidebarOpen ? 'sm' : 'icon-sm'}
                        variant="bordered"
                        rounded="lg"
                        tooltip={isSidebarOpen ? undefined : 'Search'}
                        tooltipSide="right"
                        className={cn(
                            isSidebarOpen && 'relative w-full',
                            'text-muted-foreground justify-center px-2'
                        )}
                        onClick={() => setIsCommandSearchOpen(true)}
                    >
                        <IconSearch size={14} strokeWidth={2} className={cn(isSidebarOpen)} />
                        {isSidebarOpen && 'Search'}
                        {isSidebarOpen && <div className="flex-1" />}
                        {isSidebarOpen && (
                            <div className="flex flex-row items-center gap-1">
                                <Badge
                                    variant="secondary"
                                    className="bg-muted-foreground/10 text-muted-foreground flex size-5 items-center justify-center rounded-md p-0"
                                >
                                    <IconCommand size={12} strokeWidth={2} className="shrink-0" />
                                </Badge>
                                <Badge
                                    variant="secondary"
                                    className="bg-muted-foreground/10 text-muted-foreground flex size-5 items-center justify-center rounded-md p-0"
                                >
                                    K
                                </Badge>
                            </div>
                        )}
                    </Button>
                </Flex>
                <Flex
                    direction="col"
                    gap="xs"
                    className={cn(
                        'border-hard mt-2 w-full justify-center border-t border-dashed pt-3',
                        !isSidebarOpen && 'items-center justify-center'
                    )}
                >
                    {/* <Link href="/recent" className={isSidebarOpen ? 'w-full' : ''}>
                        <Button
                            size={isSidebarOpen ? 'xs' : 'icon-sm'}
                            variant="bordered"
                            rounded="lg"
                            tooltip={isSidebarOpen ? undefined : 'Recent'}
                            tooltipSide="right"
                            className={cn(
                                'text-muted-foreground w-full justify-start',
                                !isSidebarOpen && 'w-auto justify-center'
                            )}
                        >
                            <IconHistory size={14} strokeWidth={2} />
                            {isSidebarOpen && 'Recent'}
                            {isSidebarOpen && <span className="inline-flex flex-1" />}
                            {isSidebarOpen && <IconChevronRight size={14} strokeWidth={2} />}
                        </Button>
                    </Link> */}
                </Flex>

                {false ? (
                    <FullPageLoader />
                ) : (
                    <Flex
                        direction="col"
                        gap="md"
                        className={cn(
                            'no-scrollbar w-full flex-1 overflow-y-auto pb-[100px]',
                            isSidebarOpen ? 'flex' : 'hidden'
                        )}
                    >
                        {renderGroup({
                            title: 'Pinned',
                            threads: threads
                                .filter(thread => thread.pinned)
                                .sort((a, b) => b.pinnedAt.getTime() - a.pinnedAt.getTime()),
                            groupIcon: <IconPinned size={14} strokeWidth={2} />,
                            renderEmptyState: () => (
                                <div className="border-hard flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-2">
                                    <p className="text-muted-foreground text-xs opacity-50">
                                        No pinned threads
                                    </p>
                                </div>
                            ),
                        })}
                        {renderGroup({ title: 'Today', threads: groupedThreads.today })}
                        {renderGroup({ title: 'Yesterday', threads: groupedThreads.yesterday })}
                        {renderGroup({ title: 'Last 7 Days', threads: groupedThreads.last7Days })}
                        {renderGroup({ title: 'Last 30 Days', threads: groupedThreads.last30Days })}
                        {renderGroup({
                            title: 'Previous Months',
                            threads: groupedThreads.previousMonths,
                        })}
                    </Flex>
                )}

                <Flex
                    className={cn(
                        'from-tertiary via-tertiary/95 absolute bottom-0 mt-auto w-full items-center bg-gradient-to-t via-60% to-transparent px-1.5 pb-4 pt-10',
                        isSidebarOpen && 'items-start justify-between'
                    )}
                    gap="xs"
                    direction={'col'}
                >
                    {!isSidebarOpen && (
                        <Button
                            variant="ghost"
                            size="icon"
                            tooltip="Open Sidebar"
                            tooltipSide="right"
                            onClick={() => setIsSidebarOpen(prev => !prev)}
                            className={cn(!isSidebarOpen && 'mx-auto')}
                        >
                            <IconArrowBarRight size={16} strokeWidth={2} />
                        </Button>
                    )}
                    {isSignedIn && (
                        <UserMenu
                            user={user}
                            isSidebarOpen={isSidebarOpen}
                            setIsSettingsOpen={setIsSettingsOpen}
                            openUserProfile={openUserProfile}
                            signOut={signOut}
                        />
                    )}
                    {isSidebarOpen && !isSignedIn && (
                        <div className="flex w-full flex-col gap-1.5 p-1">
                            <Button
                                variant="bordered"
                                size="sm"
                                rounded="lg"
                                onClick={() => {
                                    setIsSettingsOpen(true);
                                }}
                            >
                                <IconSettings2 size={14} strokeWidth={2} />
                                Settings
                            </Button>
                            <Button size="sm" rounded="lg" onClick={() => push('/sign-in')}>
                                Log in / Sign up
                            </Button>
                        </div>
                    )}
                </Flex>
            </Flex>
        </div>
    );
};
