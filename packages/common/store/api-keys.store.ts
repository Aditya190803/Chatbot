import { ChatMode } from '@repo/shared/config';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ApiKeys = {
    GEMINI_API_KEY?: string;
    JINA_API_KEY?: string;
    LANGSEARCH_API_KEY?: string;
    SERPER_API_KEY?: string;
    OPENROUTER_API_KEY?: string;
};

type ApiKeysState = {
    keys: ApiKeys;
    setKey: (provider: keyof ApiKeys, key: string) => void;
    removeKey: (provider: keyof ApiKeys) => void;
    clearAllKeys: () => void;
    getAllKeys: () => ApiKeys;
    hasApiKeyForChatMode: (chatMode: ChatMode) => boolean;
};

export const useApiKeysStore = create<ApiKeysState>()(
    persist(
        (set, get) => ({
            keys: {},
            setKey: (provider, key) =>
                set(state => ({
                    keys: { ...state.keys, [provider]: key },
                })),
            removeKey: provider =>
                set(state => {
                    const newKeys = { ...state.keys };
                    delete newKeys[provider];
                    return { keys: newKeys };
                }),
            clearAllKeys: () => set({ keys: {} }),
            getAllKeys: () => get().keys,
            hasApiKeyForChatMode: (chatMode: ChatMode) => {
                const apiKeys = get().keys;
                switch (chatMode) {
                    case ChatMode.GEMINI_2_5_PRO:
                    case ChatMode.GEMINI_2_5_FLASH:
                    case ChatMode.IMAGE_STUDIO:
                        return !!apiKeys['GEMINI_API_KEY'];
                    case ChatMode.GROK_4_FAST:
                    case ChatMode.GLM_4_5_AIR:
                    case ChatMode.DEEPSEEK_CHAT_V3_1:
                    case ChatMode.GPT_OSS_120B:
                    case ChatMode.DOLPHIN_MISTRAL_24B_VENICE:
                        return !!apiKeys['OPENROUTER_API_KEY'];
                    default:
                        return false;
                }
            },
        }),
        {
            name: 'api-keys-storage',
        }
    )
);
