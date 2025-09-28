export enum ChatMode {
    Pro = 'pro',
    Deep = 'deep',
    GEMINI_2_FLASH = 'gemini-flash-2.0',
    GEMINI_2_5_FLASH = 'gemini-flash-2.5',
    GROK_4_FAST = 'grok-4-fast',
    GLM_4_5_AIR = 'glm-4-5-air',
    DEEPSEEK_CHAT_V3_1 = 'deepseek-chat-v3-1',
    GPT_OSS_120B = 'gpt-oss-120b',
    DOLPHIN_MISTRAL_24B_VENICE = 'dolphin-mistral-24b-venice',
}

export const ChatModeConfig: Record<
    ChatMode,
    {
        webSearch: boolean;
        imageUpload: boolean;
        retry: boolean;
        isNew?: boolean;
        isAuthRequired?: boolean;
    }
> = {
    [ChatMode.Deep]: {
        webSearch: false,
        imageUpload: false,
        retry: false,
        isAuthRequired: true,
    },
    [ChatMode.Pro]: {
        webSearch: false,
        imageUpload: false,
        retry: false,
        isAuthRequired: true,
    },
    [ChatMode.GEMINI_2_FLASH]: {
        webSearch: true,
        imageUpload: true,
        retry: true,
        isAuthRequired: false,
    },
    [ChatMode.GEMINI_2_5_FLASH]: {
        webSearch: true,
        imageUpload: true,
        retry: true,
        isAuthRequired: false,
    },
    [ChatMode.GROK_4_FAST]: {
        webSearch: true,
        imageUpload: false,
        retry: true,
        isNew: true,
        isAuthRequired: false,
    },
    [ChatMode.GLM_4_5_AIR]: {
        webSearch: true,
        imageUpload: false,
        retry: true,
        isNew: true,
        isAuthRequired: false,
    },
    [ChatMode.DEEPSEEK_CHAT_V3_1]: {
        webSearch: true,
        imageUpload: false,
        retry: true,
        isNew: true,
        isAuthRequired: false,
    },
    [ChatMode.GPT_OSS_120B]: {
        webSearch: true,
        imageUpload: false,
        retry: true,
        isNew: true,
        isAuthRequired: false,
    },
    [ChatMode.DOLPHIN_MISTRAL_24B_VENICE]: {
        webSearch: true,
        imageUpload: false,
        retry: true,
        isNew: true,
        isAuthRequired: false,
    },
};



export const getChatModeName = (mode: ChatMode) => {
    switch (mode) {
        case ChatMode.Deep:
            return 'Deep Research';
        case ChatMode.Pro:
            return 'Pro Search';
        case ChatMode.GEMINI_2_FLASH:
            return 'Gemini 2 Flash';
        case ChatMode.GEMINI_2_5_FLASH:
            return 'Gemini 2.5 Flash';
        case ChatMode.GROK_4_FAST:
            return 'Grok 4 Fast';
        case ChatMode.GLM_4_5_AIR:
            return 'GLM 4.5 Air';
        case ChatMode.DEEPSEEK_CHAT_V3_1:
            return 'DeepSeek Chat v3.1';
        case ChatMode.GPT_OSS_120B:
            return 'GPT-OSS 120B';
        case ChatMode.DOLPHIN_MISTRAL_24B_VENICE:
            return 'Dolphin Mistral 24B Venice';
    }
};
