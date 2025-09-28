'use client';
import { useUser } from '@clerk/nextjs';
import { DotSpinner } from '@repo/common/components';
import { useApiKeysStore, useChatStore } from '@repo/common/store';
import { ChatMode, ChatModeConfig } from '@repo/shared/config';
import {
    Button,
    cn,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    Kbd,
} from '@repo/ui';
import {
    IconArrowUp,
    IconAtom,
    IconChevronDown,
    IconNorthStar,
    IconPaperclip,
    IconPlayerStopFilled,
    IconWorld,
} from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { NewIcon } from '../icons';

export const chatOptions = [
    {
        label: 'Deep Research',
        description: 'In depth research on complex topic',
        value: ChatMode.Deep,
        icon: <IconAtom size={16} className="text-muted-foreground" strokeWidth={2} />,

    },
    {
        label: 'Pro Search',
        description: 'Pro search with web search',
        value: ChatMode.Pro,
        icon: <IconNorthStar size={16} className="text-muted-foreground" strokeWidth={2} />,

    },
];

export const modelOptions = [
    {
        label: 'Gemini 2.5 Flash',
        value: ChatMode.GEMINI_2_5_FLASH,
        // webSearch: true,
        icon: undefined,

    },
    {
        label: 'Gemini 2 Flash',
        value: ChatMode.GEMINI_2_FLASH,
        // webSearch: true,
        icon: undefined,
    },
    {
        label: 'Grok 4 Fast (OpenRouter)',
        value: ChatMode.GROK_4_FAST,
        icon: undefined,
    },
    {
        label: 'GLM 4.5 Air (OpenRouter)',
        value: ChatMode.GLM_4_5_AIR,
        icon: undefined,
    },
    {
        label: 'DeepSeek Chat v3.1 (OpenRouter)',
        value: ChatMode.DEEPSEEK_CHAT_V3_1,
        icon: undefined,
    },
    {
        label: 'GPT-OSS 120B (OpenRouter)',
        value: ChatMode.GPT_OSS_120B,
        icon: undefined,
    },
    {
        label: 'Dolphin Mistral 24B Venice (OpenRouter)',
        value: ChatMode.DOLPHIN_MISTRAL_24B_VENICE,
        icon: undefined,
    },
];

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
    const hasApiKeyForChatMode = useApiKeysStore(state => state.hasApiKeyForChatMode);
    const isChatPage = usePathname().startsWith('/chat');

    const selectedOption =
        (isChatPage
            ? [...chatOptions, ...modelOptions].find(option => option.value === chatMode)
            : [...modelOptions].find(option => option.value === chatMode)) ?? modelOptions[0];

    return (
        <DropdownMenu open={isChatModeOpen} onOpenChange={setIsChatModeOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant={'secondary'} size="xs">
                    {selectedOption?.icon}
                    {selectedOption?.label}
                    <IconChevronDown size={14} strokeWidth={2} />
                </Button>
            </DropdownMenuTrigger>
            <ChatModeOptions chatMode={chatMode} setChatMode={setChatMode} />
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
}: {
    chatMode: ChatMode;
    setChatMode: (chatMode: ChatMode) => void;
    isRetry?: boolean;
}) => {
    const { isSignedIn } = useUser();
    const isChatPage = usePathname().startsWith('/chat');
    const { push } = useRouter();
    return (
        <DropdownMenuContent
            align="start"
            side="bottom"
            className="no-scrollbar max-h-[300px] w-[300px] overflow-y-auto"
        >
            {isChatPage && (
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Advanced Mode</DropdownMenuLabel>
                    {chatOptions.map(option => (
                        <DropdownMenuItem
                            key={option.label}
                            onSelect={() => {
                                if (ChatModeConfig[option.value]?.isAuthRequired && !isSignedIn) {
                                    push('/sign-in');
                                    return;
                                }
                                setChatMode(option.value);
                            }}
                            className="h-auto"
                        >
                            <div className="flex w-full flex-row items-start gap-1.5 px-1.5 py-1.5">
                                <div className="flex flex-col gap-0 pt-1">{option.icon}</div>

                                <div className="flex flex-col gap-0">
                                    {<p className="m-0 text-sm font-medium">{option.label}</p>}
                                    {option.description && (
                                        <p className="text-muted-foreground text-xs font-light">
                                            {option.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex-1" />
                                {ChatModeConfig[option.value]?.isNew && <NewIcon />}
                            </div>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
            )}
            <DropdownMenuGroup>
                <DropdownMenuLabel>Models</DropdownMenuLabel>
                {modelOptions.map(option => (
                    <DropdownMenuItem
                        key={option.label}
                        onSelect={() => {
                            if (ChatModeConfig[option.value]?.isAuthRequired && !isSignedIn) {
                                push('/sign-in');
                                return;
                            }
                            setChatMode(option.value);
                        }}
                        className="h-auto"
                    >
                        <div className="flex w-full flex-row items-center gap-2.5 px-1.5 py-1.5">
                            <div className="flex flex-col gap-0">
                                {<p className="text-sm font-medium">{option.label}</p>}
                            </div>
                            <div className="flex-1" />
                            {ChatModeConfig[option.value]?.isNew && <NewIcon />}


                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuGroup>
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
                {isGenerating && !isChatPage ? (
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
