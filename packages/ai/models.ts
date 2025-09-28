import { ChatMode } from '@repo/shared/config';
import { CoreMessage } from 'ai';
import { ProviderEnumType } from './providers';

export enum ModelEnum {
    GEMINI_2_FLASH = 'gemini-2.0-flash',
    GEMINI_2_5_FLASH = 'gemini-2.5-flash',
    GROK_4_FAST = 'x-ai/grok-4-fast:free',
    GLM_4_5_AIR = 'z-ai/glm-4.5-air:free',
    DEEPSEEK_CHAT_V3_1 = 'deepseek/deepseek-chat-v3.1:free',
    GPT_OSS_120B = 'openai/gpt-oss-120b:free',
    DOLPHIN_MISTRAL_24B_VENICE = 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
}

export type Model = {
    id: ModelEnum;
    name: string;
    provider: ProviderEnumType;
    maxTokens: number;
    contextWindow: number;
};

export const models: Model[] = [
    {
        id: ModelEnum.GEMINI_2_5_FLASH,
        name: 'Gemini 2.5 Flash',
        provider: 'google',
        maxTokens: 200000,
        contextWindow: 200000,
    },
    {
        id: ModelEnum.GEMINI_2_FLASH,
        name: 'Gemini 2 Flash',
        provider: 'google',
        maxTokens: 200000,
        contextWindow: 200000,
    },
    {
        id: ModelEnum.GROK_4_FAST,
        name: 'Grok 4 Fast (OpenRouter Free)',
        provider: 'openrouter',
        maxTokens: 8000,
        contextWindow: 128000,
    },
    {
        id: ModelEnum.GLM_4_5_AIR,
        name: 'GLM 4.5 Air (OpenRouter Free)',
        provider: 'openrouter',
        maxTokens: 8000,
        contextWindow: 128000,
    },
    {
        id: ModelEnum.DEEPSEEK_CHAT_V3_1,
        name: 'DeepSeek Chat v3.1 (OpenRouter Free)',
        provider: 'openrouter',
        maxTokens: 8000,
        contextWindow: 128000,
    },
    {
        id: ModelEnum.GPT_OSS_120B,
        name: 'GPT-OSS 120B (OpenRouter Free)',
        provider: 'openrouter',
        maxTokens: 8000,
        contextWindow: 128000,
    },
    {
        id: ModelEnum.DOLPHIN_MISTRAL_24B_VENICE,
        name: 'Dolphin Mistral 24B Venice (OpenRouter Free)',
        provider: 'openrouter',
        maxTokens: 8000,
        contextWindow: 128000,
    },
];

export const getModelFromChatMode = (mode?: string): ModelEnum => {
    switch (mode) {
        case ChatMode.GEMINI_2_FLASH:
            return ModelEnum.GEMINI_2_FLASH;
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
        case ChatMode.GEMINI_2_FLASH:
            return 500000;
        case ChatMode.GEMINI_2_5_FLASH:
            return 500000;
        case ChatMode.GROK_4_FAST:
        case ChatMode.GLM_4_5_AIR:
        case ChatMode.DEEPSEEK_CHAT_V3_1:
        case ChatMode.GPT_OSS_120B:
        case ChatMode.DOLPHIN_MISTRAL_24B_VENICE:
            return 128000;
        case ChatMode.Deep:
            return 500000;
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
