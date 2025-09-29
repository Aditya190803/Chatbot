export enum ChatMode {
    Pro = 'pro',
    Deep = 'deep',
    GEMINI_2_5_PRO = 'gemini-pro-2.5',
    GEMINI_2_5_FLASH = 'gemini-flash-2.5',
    GROK_4_FAST = 'grok-4-fast',
    GLM_4_5_AIR = 'glm-4-5-air',
    DEEPSEEK_CHAT_V3_1 = 'deepseek-chat-v3-1',
    GPT_OSS_120B = 'gpt-oss-120b',
    DOLPHIN_MISTRAL_24B_VENICE = 'dolphin-mistral-24b-venice',
    DOCUMENT_QA = 'document-qa',
}

export const ChatModeConfig: Record<
    ChatMode,
    {
        webSearch: boolean;
        imageUpload: boolean;
        retry: boolean;
        documentAnalysis?: boolean;
        nativeInternetAccess?: boolean; // Models can access internet independently of web search toggle
        isNew?: boolean;
        isAuthRequired?: boolean;
    }
> = {
    [ChatMode.Deep]: {
        webSearch: false,
        imageUpload: false,
        retry: false,
        documentAnalysis: true,
        isAuthRequired: true,
    },
    [ChatMode.Pro]: {
        webSearch: false,
        imageUpload: false,
        retry: false,
        documentAnalysis: true,
        isAuthRequired: true,
    },
    [ChatMode.GEMINI_2_5_PRO]: {
        webSearch: true,
        imageUpload: true,
        retry: true,
        documentAnalysis: true,
        nativeInternetAccess: true,
        isAuthRequired: false,
    },
    [ChatMode.GEMINI_2_5_FLASH]: {
        webSearch: true,
        imageUpload: true,
        retry: true,
        documentAnalysis: true,
        nativeInternetAccess: true,
        isAuthRequired: false,
    },
    [ChatMode.GROK_4_FAST]: {
        webSearch: true,
        imageUpload: false,
        retry: true,
        documentAnalysis: true,
        nativeInternetAccess: true,
        isNew: true,
        isAuthRequired: false,
    },
    [ChatMode.GLM_4_5_AIR]: {
        webSearch: true,
        imageUpload: true,
        retry: true,
        documentAnalysis: true,
        nativeInternetAccess: true,
        isNew: true,
        isAuthRequired: false,
    },
    [ChatMode.DEEPSEEK_CHAT_V3_1]: {
        webSearch: true,
        imageUpload: true,
        retry: true,
        documentAnalysis: true,
        nativeInternetAccess: true,
        isNew: true,
        isAuthRequired: false,
    },
    [ChatMode.GPT_OSS_120B]: {
        webSearch: true,
        imageUpload: true,
        retry: true,
        documentAnalysis: true,
        nativeInternetAccess: true,
        isNew: true,
        isAuthRequired: false,
    },
    [ChatMode.DOLPHIN_MISTRAL_24B_VENICE]: {
        webSearch: true,
        imageUpload: true,
        retry: true,
        documentAnalysis: true,
        nativeInternetAccess: true,
        isNew: true,
        isAuthRequired: false,
    },
    [ChatMode.DOCUMENT_QA]: {
        webSearch: false,
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
        case ChatMode.GEMINI_2_5_PRO:
            return 'Gemini 2.5 Pro';
        case ChatMode.GEMINI_2_5_FLASH:
            return 'Gemini 2.5 Flash';
        case ChatMode.GROK_4_FAST:
            return 'Llama 3.2 3B Instruct';
        case ChatMode.GLM_4_5_AIR:
            return 'Phi 3 Mini 128K';
        case ChatMode.DEEPSEEK_CHAT_V3_1:
            return 'Qwen 2 7B Instruct';
        case ChatMode.GPT_OSS_120B:
            return 'Zephyr 7B Beta';
        case ChatMode.DOLPHIN_MISTRAL_24B_VENICE:
            return 'Mistral 7B Instruct';
        case ChatMode.DOCUMENT_QA:
            return 'Document Q&A';
    }
};
