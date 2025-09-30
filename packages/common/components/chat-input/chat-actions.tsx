'use client';

import { useUser } from '@clerk/nextjs';
import { DotSpinner } from '@repo/common/components';
import { useChatStore } from '@repo/common/store';
import { ChatMode, ChatModeConfig } from '@repo/shared/config';
import { Button, cn, Kbd } from '@repo/ui';
import * as DropdownMenuComponents from '@repo/ui/src/components/dropdown-menu';
import {
    IconArrowUp,
    IconAtom,
    IconCheck,
    IconChevronDown,
    IconNorthStar,
    IconPhoto,
    IconPaperclip,
    IconPlayerStopFilled,
    IconWorld,
} from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { type ComponentType, useState } from 'react';

type IconComponent = typeof IconAtom;

type ChatModeOption = {
    label: string;
    description?: string;
    value: ChatMode;
    icon?: IconComponent;
    iconClassName?: string;
    badge?: string;
    badgeClassName?: string;
    disabled?: boolean;
};

export const chatOptions: ChatModeOption[] = [
    {
        label: 'Deep Research',
        description: 'In depth research on complex topic',
        value: ChatMode.Deep,
        icon: IconAtom,
        iconClassName: 'text-purple-600',
        badge: 'Workflow',
    },
    {
        label: 'Pro Search',
        description: 'Pro search with web search',
        value: ChatMode.Pro,
        icon: IconNorthStar,
        iconClassName: 'text-sky-600',
        badge: 'Web',
    },
    {
        label: 'Gemini Image Preview',
        description: 'Generate or edit images with Gemini',
        value: ChatMode.IMAGE_GENERATION,
        icon: IconPhoto,
        iconClassName: 'text-rose-500',
        badge: 'Images',
    },
];

export const modelOptions: ChatModeOption[] = [
    {
        label: 'Gemini 2.5 Flash',
        value: ChatMode.GEMINI_2_5_FLASH,
    },
    {
        label: 'Gemini 2.5 Pro',
        value: ChatMode.GEMINI_2_5_PRO,
    },
    {
        label: 'Grok 4 Fast',
        value: ChatMode.GROK_4_FAST,

    },
    {
        label: 'GLM 4.5 Air',
        value: ChatMode.GLM_4_5_AIR,
    },
    {
        label: 'DeepSeek Chat v3.1',
        value: ChatMode.DEEPSEEK_CHAT_V3_1,
    },
    {
        label: 'GPT-OSS 120B',
        value: ChatMode.GPT_OSS_120B,
        badge: 'Temporarily unavailable',
        badgeClassName: 'border border-amber-200/70 bg-amber-100 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200',
        disabled: true,
    },
    {
        label: 'Dolphin Mistral 24B Venice',
        value: ChatMode.DOLPHIN_MISTRAL_24B_VENICE,
    },
];

const {
    DropdownMenu: DropdownMenuRoot,
    DropdownMenuTrigger: DropdownMenuTriggerComponent,
    DropdownMenuContent: DropdownMenuContentComponent,
    DropdownMenuItem: DropdownMenuItemComponent,
    DropdownMenuLabel: DropdownMenuLabelComponent,
    DropdownMenuSeparator: DropdownMenuSeparatorComponent,
} = DropdownMenuComponents as typeof import('@repo/ui/src/components/dropdown-menu');

const DropdownMenu = DropdownMenuRoot as unknown as ComponentType<any>;
const DropdownMenuTrigger = DropdownMenuTriggerComponent as unknown as ComponentType<any>;
const DropdownMenuContent = DropdownMenuContentComponent as unknown as ComponentType<any>;
const DropdownMenuItem = DropdownMenuItemComponent as unknown as ComponentType<any>;
const DropdownMenuLabel = DropdownMenuLabelComponent as unknown as ComponentType<any>;
const DropdownMenuSeparator = DropdownMenuSeparatorComponent as unknown as ComponentType<any>;

export const AttachmentButton = () => {
    return (
        <Button
            size="icon"
            tooltip="Attachment (coming soon)"
            variant="ghost"
            className="gap-2"
            rounded="full"
            disabled
        >
            <IconPaperclip size={18} strokeWidth={2} className="text-muted-foreground" />
        </Button>
    );
};

export const ChatModeButton = () => {
    const chatMode = useChatStore(state => state.chatMode);
    const setChatMode = useChatStore(state => state.setChatMode);
    const [isChatModeOpen, setIsChatModeOpen] = useState(false);
    const isChatPage = usePathname().startsWith('/chat');

    const allOptions = [...chatOptions, ...modelOptions];
    const selectedOption =
        allOptions.find(option => option.value === chatMode) ?? modelOptions[0];
    const SelectedIcon = (selectedOption?.icon as IconComponent | undefined) ?? undefined;

    return (
        <DropdownMenu open={isChatModeOpen} onOpenChange={setIsChatModeOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant={'secondary'} size="xs">
                    {SelectedIcon && (
                        <span className="mr-1 flex size-5 items-center justify-center rounded-full bg-muted/60">
                            <SelectedIcon
                                size={14}
                                strokeWidth={2}
                                className={selectedOption.iconClassName ?? 'text-muted-foreground'}
                            />
                        </span>
                    )}
                    {selectedOption?.label}
                    <IconChevronDown size={14} strokeWidth={2} />
                </Button>
            </DropdownMenuTrigger>
            <ChatModeOptions
                chatMode={chatMode}
                setChatMode={setChatMode}
                onOptionSelect={() => setIsChatModeOpen(false)}
            />
        </DropdownMenu>
    );
};

export const WebSearchButton = () => {
    const useWebSearch = useChatStore(state => state.useWebSearch);
    const setUseWebSearch = useChatStore(state => state.setUseWebSearch);
    const chatMode = useChatStore(state => state.chatMode);

    if (!ChatModeConfig[chatMode]?.webSearch) return null;

    return (
        <Button
            size={useWebSearch ? 'sm' : 'icon-sm'}
            tooltip="Web Search"
            variant={useWebSearch ? 'secondary' : 'ghost'}
            className={cn('gap-2', useWebSearch && 'bg-blue-500/10 text-blue-500')}
            onClick={() => setUseWebSearch(!useWebSearch)}
        >
            <IconWorld
                size={16}
                strokeWidth={2}
                className={cn(useWebSearch ? '!text-blue-500' : 'text-muted-foreground')}
            />
            {useWebSearch && <p className="text-xs">Web</p>}
        </Button>
    );
};

export const NewLineIndicator = () => {
    const editor = useChatStore(state => state.editor);
    const hasTextInput = !!editor?.getText();

    if (!hasTextInput) return null;

    return (
        <p className="flex flex-row items-center gap-1 text-xs text-gray-500">
            use <Kbd>Shift</Kbd> <Kbd>Enter</Kbd> for new line
        </p>
    );
};

export const GeneratingStatus = () => {
    return (
        <div className="text-muted-foreground flex flex-row items-center gap-1 px-2 text-xs">
            <DotSpinner /> Generating...
        </div>
    );
};

export const ChatModeOptions = ({
    chatMode,
    setChatMode,
    isRetry = false,
    onOptionSelect,
}: {
    chatMode: ChatMode;
    setChatMode: (chatMode: ChatMode) => void | Promise<void>;
    isRetry?: boolean;
    onOptionSelect?: () => void;
}) => {
    const { isSignedIn } = useUser();
    const isChatPage = usePathname().startsWith('/chat');
    const { push } = useRouter();

    const handleSelect = async (
        event: Event,
        mode: ChatMode,
        requiresAuth?: boolean
    ) => {
        if (requiresAuth && !isSignedIn) {
            event.preventDefault();
            push('/sign-in');
            return;
        }

        await Promise.resolve(setChatMode(mode));
        onOptionSelect?.();
    };

    const description = isRetry
        ? 'Re-run this response with a different model or workflow.'
        : 'Pick the workflow or base model you want to use for upcoming messages.';

    const renderOption = (option: ChatModeOption) => {
        const isActive = chatMode === option.value;
        const isDisabled = option.disabled;
        const Icon = option.icon ?? IconAtom;
        const iconClassName = option.iconClassName ?? 'text-muted-foreground';

        return (
            <DropdownMenuItem
                key={option.value}
                disabled={isDisabled}
                onSelect={(event: Event) => {
                    if (isDisabled) {
                        event.preventDefault();
                        if ('stopPropagation' in event && typeof event.stopPropagation === 'function') {
                            event.stopPropagation();
                        }
                        return;
                    }

                    handleSelect(event, option.value, ChatModeConfig[option.value]?.isAuthRequired);
                }}
                className={cn(
                    'group h-auto w-full flex-col items-start gap-2 rounded-lg px-3 py-1.5 text-left',
                    isActive
                        ? 'bg-brand/10 text-foreground ring-1 ring-brand/40'
                        : 'hover:bg-muted/60 text-foreground',
                    isDisabled &&
                        'cursor-not-allowed opacity-60 hover:bg-transparent hover:text-foreground'
                )}
            >
                <div className="flex w-full items-start gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/70 text-muted-foreground group-hover:bg-muted">
                        <Icon size={18} strokeWidth={2} className={iconClassName} />
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                        <div className="flex w-full items-center gap-2">
                            <span className="text-sm font-medium leading-tight">{option.label}</span>
                            {option.badge && (
                                <span
                                    className={cn(
                                        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                        option.badgeClassName ??
                                            'border border-border/60 bg-muted/60 text-muted-foreground'
                                    )}
                                >
                                    {option.badge}
                                </span>
                            )}
                            <span className="flex-1" />
                            {isActive && (
                                <IconCheck size={16} strokeWidth={2} className="text-brand" />
                            )}
                        </div>
                        {option.description && (
                            <p className="text-muted-foreground/80 text-xs leading-snug">
                                {option.description}
                            </p>
                        )}
                    </div>
                </div>
            </DropdownMenuItem>
        );
    };

    return (
        <DropdownMenuContent className="no-scrollbar w-[260px] max-w-[90vw] overflow-hidden border border-border/80 bg-background/95 p-0 shadow-xl backdrop-blur">
            <div className="border-border/70 border-b px-4 py-3">
                <p className="text-muted-foreground/80 text-[11px] font-semibold uppercase tracking-wide">
                    {isRetry ? 'Rewrite options' : 'Choose your mode'}
                </p>
                <p className="text-muted-foreground text-xs leading-snug">{description}</p>
            </div>

            <div className="max-h-[320px] overflow-y-auto px-3 py-2">
                {isChatPage && (
                    <div className="space-y-2">
                        <DropdownMenuLabel className="text-muted-foreground/70 px-1 text-[11px] font-semibold uppercase tracking-wide">
                            Guided workflows
                        </DropdownMenuLabel>
                        <div className="space-y-1.5">{chatOptions.map(renderOption)}</div>
                        <DropdownMenuSeparator className="my-2" />
                    </div>
                )}

                <div className="space-y-2">
                    <DropdownMenuLabel className="text-muted-foreground/70 px-1 text-[11px] font-semibold uppercase tracking-wide">
                        Models
                    </DropdownMenuLabel>
                    <div className="space-y-1.5">{modelOptions.map(renderOption)}</div>
                </div>
            </div>
        </DropdownMenuContent>
    );
};

export const SendStopButton = ({
    isGenerating,
    isChatPage,
    stopGeneration,
    hasTextInput,
    sendMessage,
}: {
    isGenerating: boolean;
    isChatPage: boolean;
    stopGeneration: () => void;
    hasTextInput: boolean;
    sendMessage: () => void;
}) => {
    return (
        <div className="flex flex-row items-center gap-2">
            <AnimatePresence mode="wait" initial={false}>
                {isGenerating ? (
                    <motion.div
                        key="stop-button"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Button
                            size="icon-sm"
                            variant="default"
                            onClick={stopGeneration}
                            tooltip="Stop Generation"
                        >
                            <IconPlayerStopFilled size={14} strokeWidth={2} />
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="send-button"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Button
                            size="icon-sm"
                            tooltip="Send Message"
                            variant={hasTextInput ? 'default' : 'secondary'}
                            disabled={!hasTextInput || isGenerating}
                            onClick={() => {
                                sendMessage();
                            }}
                        >
                            <IconArrowUp size={16} strokeWidth={2} />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
