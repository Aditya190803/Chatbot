import { ChatMode } from '@repo/shared/config';
import { CoreMessage } from 'ai';
import { ProviderEnumType } from './providers';

export * from './cost-tracker';

export enum ModelEnum {
    GEMINI_2_5_PRO = 'gemini-2.5-pro',
    GEMINI_2_5_FLASH = 'gemini-2.5-flash',
    GROK_4_FAST = 'meta-llama/llama-3.2-3b-instruct:free',
    GLM_4_5_AIR = 'microsoft/phi-3-mini-128k-instruct:free',
    DEEPSEEK_CHAT_V3_1 = 'qwen/qwen-2-7b-instruct:free',
    GPT_OSS_120B = 'huggingfaceh4/zephyr-7b-beta:free',
    DOLPHIN_MISTRAL_24B_VENICE = 'mistralai/mistral-7b-instruct:free',
}

export type Model = {
    id: ModelEnum;
    name: string;
    provider: ProviderEnumType;
    maxTokens: number;
    contextWindow: number;
    costPer1MInput?: number;  // Cost per 1M input tokens (USD)
    costPer1MOutput?: number; // Cost per 1M output tokens (USD)
    isFree?: boolean;
};

export const models: Model[] = [
    {
        id: ModelEnum.GEMINI_2_5_FLASH,
        name: 'Gemini 2.5 Flash',
        provider: 'google',
        maxTokens: 200000,
        contextWindow: 200000,
        costPer1MInput: 0.075,
        costPer1MOutput: 0.30,
    },
    {
        id: ModelEnum.GEMINI_2_5_PRO,
        name: 'Gemini 2.5 Pro',
        provider: 'google',
        maxTokens: 200000,
        contextWindow: 200000,
        costPer1MInput: 1.25,
        costPer1MOutput: 5.00,
    },
    {
        id: ModelEnum.GROK_4_FAST,
        name: 'Llama 3.2 3B Instruct (OpenRouter Free)',
        provider: 'openrouter',
        maxTokens: 131072,
        contextWindow: 131072,
        isFree: true,
    },
    {
        id: ModelEnum.GLM_4_5_AIR,
        name: 'Phi 3 Mini 128K Instruct (OpenRouter Free)',
        provider: 'openrouter',
        maxTokens: 128000,
        contextWindow: 128000,
        isFree: true,
    },
    {
        id: ModelEnum.DEEPSEEK_CHAT_V3_1,
        name: 'Qwen 2 7B Instruct (OpenRouter Free)',
        provider: 'openrouter',
        maxTokens: 32768,
        contextWindow: 32768,
        isFree: true,
    },
    {
        id: ModelEnum.GPT_OSS_120B,
        name: 'Zephyr 7B Beta (OpenRouter Free)',
        provider: 'openrouter',
        maxTokens: 32768,
        contextWindow: 32768,
        isFree: true,
    },
    {
        id: ModelEnum.DOLPHIN_MISTRAL_24B_VENICE,
        name: 'Mistral 7B Instruct (OpenRouter Free)',
        provider: 'openrouter',
        maxTokens: 32768,
        contextWindow: 32768,
        isFree: true,
    },
];

export const getModelFromChatMode = (mode?: string): ModelEnum => {
    switch (mode) {
        case ChatMode.GEMINI_2_5_PRO:
            return ModelEnum.GEMINI_2_5_PRO;
        case ChatMode.GEMINI_2_5_FLASH:
            return ModelEnum.GEMINI_2_5_FLASH;
        case ChatMode.GROK_4_FAST:
            return ModelEnum.GROK_4_FAST;
        case ChatMode.GLM_4_5_AIR:
            return ModelEnum.GLM_4_5_AIR;
        case ChatMode.DEEPSEEK_CHAT_V3_1:
            return ModelEnum.DEEPSEEK_CHAT_V3_1;
        case ChatMode.GPT_OSS_120B:
            return ModelEnum.GPT_OSS_120B;
        case ChatMode.DOLPHIN_MISTRAL_24B_VENICE:
            return ModelEnum.DOLPHIN_MISTRAL_24B_VENICE;
        default:
            return ModelEnum.GEMINI_2_5_FLASH;
    }
};

export const getChatModeMaxTokens = (mode: ChatMode) => {
    switch (mode) {
        case ChatMode.GEMINI_2_5_PRO:
        case ChatMode.GEMINI_2_5_FLASH:
            return 500000;
        case ChatMode.GROK_4_FAST:
            return 131072;
        case ChatMode.GLM_4_5_AIR:
            return 128000;
        case ChatMode.DEEPSEEK_CHAT_V3_1:
        case ChatMode.GPT_OSS_120B:
        case ChatMode.DOLPHIN_MISTRAL_24B_VENICE:
            return 32768;
        case ChatMode.Deep:
        case ChatMode.Pro:
            return 500000;
        default:
            return 500000;
    }
};

export const estimateTokensByWordCount = (text: string): number => {
    // Simple word splitting by whitespace
    const words = text?.trim().split(/\s+/);

    // Using a multiplier of 1.35 tokens per word for English text
    const estimatedTokens = Math.ceil(words.length * 1.35);

    return estimatedTokens;
};

export const estimateTokensForMessages = (messages: CoreMessage[]): number => {
    let totalTokens = 0;

    for (const message of messages) {
        if (typeof message.content === 'string') {
            totalTokens += estimateTokensByWordCount(message.content);
        } else if (Array.isArray(message.content)) {
            for (const part of message.content) {
                if (part.type === 'text') {
                    totalTokens += estimateTokensByWordCount(part.text);
                }
            }
        }
    }

    return totalTokens;
};

export const trimMessageHistoryEstimated = (messages: CoreMessage[], chatMode: ChatMode) => {
    const maxTokens = getChatModeMaxTokens(chatMode);
    let trimmedMessages = [...messages];

    if (trimmedMessages.length <= 1) {
        const tokenCount = estimateTokensForMessages(trimmedMessages);
        return { trimmedMessages, tokenCount };
    }

    const latestMessage = trimmedMessages.pop()!;

    const messageSizes = trimmedMessages.map(msg => {
        const tokens =
            typeof msg.content === 'string'
                ? estimateTokensByWordCount(msg.content)
                : Array.isArray(msg.content)
                  ? msg.content.reduce(
                        (sum, part) =>
                            part.type === 'text' ? sum + estimateTokensByWordCount(part.text) : sum,
                        0
                    )
                  : 0;
        return { message: msg, tokens };
    });

    let totalTokens = messageSizes.reduce((sum, item) => sum + item.tokens, 0);

    // Count tokens for the latest message
    const latestMessageTokens =
        typeof latestMessage.content === 'string'
            ? estimateTokensByWordCount(latestMessage.content)
            : Array.isArray(latestMessage.content)
              ? latestMessage.content.reduce(
                    (sum, part) =>
                        part.type === 'text' ? sum + estimateTokensByWordCount(part.text) : sum,
                    0
                )
              : 0;

    totalTokens += latestMessageTokens;

    while (totalTokens > maxTokens && messageSizes.length > 0) {
        const removed = messageSizes.shift();
        if (removed) {
            totalTokens -= removed.tokens;
        }
    }

    trimmedMessages = messageSizes.map(item => item.message);
    trimmedMessages.push(latestMessage);

    return { trimmedMessages, tokenCount: totalTokens };
};
