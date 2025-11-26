'use client';
import React, { useState } from 'react';

import { FullPageLoader, HistoryItem, Logo, SyncStatus } from '@repo/common/components';
import { useAuth, useRootContext } from '@repo/common/context';
import type { AuthUser } from '@repo/common/auth';
import { useAppStore, useChatStore } from '@repo/common/store';
import { Thread } from '@repo/shared/types';
import { Badge, Button, cn, Flex } from '@repo/ui';
import * as DropdownMenuComponents from '@repo/ui/src/components/dropdown-menu';
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

const {
    DropdownMenu: DropdownMenuRoot,
    DropdownMenuTrigger: DropdownMenuTriggerComponent,
    DropdownMenuContent: DropdownMenuContentComponent,
    DropdownMenuItem: DropdownMenuItemComponent,
    DropdownMenuSeparator: DropdownMenuSeparatorComponent,
} = DropdownMenuComponents as typeof import('@repo/ui/src/components/dropdown-menu');

const MenuRoot = DropdownMenuRoot as unknown as React.ComponentType<any>;
const MenuTrigger = DropdownMenuTriggerComponent as unknown as React.ComponentType<any>;
const MenuContent = DropdownMenuContentComponent as unknown as React.ComponentType<any>;
const MenuItem = DropdownMenuItemComponent as unknown as React.ComponentType<any>;
const MenuSeparator = DropdownMenuSeparatorComponent as unknown as React.ComponentType<any>;

const UserMenu: React.FC<{
    user: AuthUser | null;
    isSidebarOpen: boolean;
    setIsSettingsOpen: (open: boolean) => void;
    signOut: () => void | Promise<void>;
}> = ({ user, isSidebarOpen, setIsSettingsOpen, signOut }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const displayName =
        user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Account';

    return (
        <MenuRoot open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <MenuTrigger asChild>
                <Button
                    variant="ghost"
                    className={cn(
                        'group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/80 px-3 py-2.5 text-left shadow-subtle-xs transition-colors hover:border-border/40 hover:bg-background',
                        !isSidebarOpen &&
                            'h-9 w-auto justify-center border-none bg-transparent px-1.5 py-1.5 shadow-none hover:bg-transparent'
                    )}
                >
                    <div
                        className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-full border border-border/40 bg-gradient-to-br from-brand/90 to-brand/70 text-background shadow-subtle-xs',
                            !isSidebarOpen && 'size-7'
                        )}
                    >
                        {user?.imageUrl ? (
                            <img
                                src={user.imageUrl}
                                width={32}
                                height={32}
                                className="size-full shrink-0 rounded-full"
                                alt={displayName}
                            />
                        ) : (
                            <IconUser size={16} strokeWidth={2} className="text-background" />
                        )}
                    </div>
                    {isSidebarOpen && (
                        <div className="flex flex-1 flex-col items-start gap-0">
                            <p className="line-clamp-1 text-sm font-medium text-foreground pt-0.5">
                                {displayName}
                            </p>
                            <p className="text-muted-foreground/70 text-[11px] font-normal -mt-0.5">
                                {user?.email || 'Manage account'}
                            </p>
                        </div>
                    )}
                    {isSidebarOpen && (
                        <IconSelector
                            size={14}
                            strokeWidth={2}
                            className={cn(
                                'text-muted-foreground transition-transform',
                                isMenuOpen && 'rotate-180'
                            )}
                        />
                    )}
                </Button>
            </MenuTrigger>
            <MenuContent
                align="start"
                className="min-w-[220px]"
                side={isSidebarOpen ? 'top' : 'right'}
                sideOffset={isSidebarOpen ? 12 : 8}
            >
                <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                    <span className="text-xs text-muted-foreground">Cloud sync</span>
                    <SyncStatus showLabel={true} />
                </div>
                <MenuSeparator />
                <MenuItem
                    className="flex w-full items-center gap-2 text-sm"
                    onSelect={() => {
                        setIsSettingsOpen(true);
                    }}
                >
                    <IconSettings size={16} strokeWidth={2} />
                    Settings
                </MenuItem>
                <MenuSeparator />
                <MenuItem
                    className="flex w-full items-center gap-2 text-sm text-destructive"
                    onSelect={() => {
                        void signOut();
                    }}
                >
                    <IconLogout size={16} strokeWidth={2} />
                    Log out
                </MenuItem>
            </MenuContent>
        </MenuRoot>
    );
};

export const Sidebar = () => {
    const { threadId: currentThreadId } = useParams();
    const pathname = usePathname();
    const { setIsCommandSearchOpen, setIsMobileSidebarOpen } = useRootContext();
    const isChatPage = pathname === '/chat';
    const threads = useChatStore(state => state.threads);
    const pinThread = useChatStore(state => state.pinThread);
    const unpinThread = useChatStore(state => state.unpinThread);
    const sortThreads = (threads: Thread[], sortBy: 'createdAt') => {
        return [...threads].sort((a, b) => moment(b[sortBy]).diff(moment(a[sortBy])));
    };

    const { isSignedIn, user, signOut } = useAuth();
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
                    <div className="w-full">{renderEmptyState()}</div>
                ) : (
                    <Flex
                        className="bg-background/80 border-border/60 w-full gap-0.5 rounded-lg border px-1.5 py-1"
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
                                    // Keep sidebar open on desktop when navigating to a chat
                                    // Only close the mobile drawer to reveal content
                                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                        setIsMobileSidebarOpen(false);
                                    }
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
                isSidebarOpen ? 'w-[288px] px-4' : 'w-[64px] px-2',
                'lg:flex' // Always visible on desktop
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
                                'flex h-9 w-full cursor-pointer items-center justify-start gap-2 rounded-md px-3.5',
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
                            onClick={() => {
                                // On mobile, close the mobile drawer instead of collapsing sidebar
                                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                    setIsMobileSidebarOpen(false);
                                } else {
                                    // On desktop, toggle sidebar collapse/expand
                                    setIsSidebarOpen(prev => !prev);
                                }
                            }}
                            className="mr-1"
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
                                onClick={() => {
                                    // Close mobile sidebar when creating new thread
                                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                        setIsMobileSidebarOpen(false);
                                    }
                                }}
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
                            onClick={() => {
                                // Close mobile sidebar when creating new thread
                                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                    setIsMobileSidebarOpen(false);
                                }
                            }}
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
                            isSidebarOpen && 'relative w-full justify-between',
                            'text-muted-foreground px-2'
                        )}
                        onClick={() => {
                            setIsCommandSearchOpen(true);
                            // Close mobile sidebar when opening search
                            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                setIsMobileSidebarOpen(false);
                            }
                        }}
                    >
                        <IconSearch size={14} strokeWidth={2} className={cn(isSidebarOpen)} />
                        {isSidebarOpen && <span className="text-sm font-medium">Search</span>}
                        {isSidebarOpen && (
                            <div className="flex flex-row items-center gap-1 pr-1">
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
                        gap="lg"
                        className={cn(
                            'no-scrollbar w-full flex-1 overflow-y-auto pb-[110px] pr-0.5',
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
                                <div className="border-border/60 bg-background/70 flex w-full flex-col gap-1 rounded-lg border border-dashed px-3 py-2">
                                    <p className="text-muted-foreground/80 text-xs font-medium">
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
                        'from-tertiary via-tertiary/95 absolute bottom-0 left-0 right-0 mt-auto bg-gradient-to-t via-60% to-transparent pb-4 pt-10',
                        isSidebarOpen ? 'items-stretch px-4' : 'items-center px-2'
                    )}
                    gap="sm"
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
                        <div className={cn('w-full', !isSidebarOpen && 'flex justify-center')}>
                            <UserMenu
                                user={user}
                                isSidebarOpen={isSidebarOpen}
                                setIsSettingsOpen={setIsSettingsOpen}
                                signOut={signOut}
                            />
                        </div>
                    )}
                    {isSidebarOpen && !isSignedIn && (
                        <div className="flex w-full max-w-full flex-col gap-2 overflow-hidden rounded-lg bg-background/80 p-3 shadow-subtle-xs">
                            <Button
                                variant="bordered"
                                size="sm"
                                rounded="lg"
                                className="w-full"
                                onClick={() => {
                                    setIsSettingsOpen(true);
                                }}
                            >
                                <IconSettings2 size={14} strokeWidth={2} />
                                Settings
                            </Button>
                            <Button
                                size="sm"
                                rounded="lg"
                                className="w-full justify-start gap-2"
                                onClick={() => push('/sign-in')}
                            >
                                <IconLogout size={14} strokeWidth={2} />
                                Log in / Sign up
                            </Button>
                        </div>
                    )}
                </Flex>
            </Flex>
        </div>
    );
};
