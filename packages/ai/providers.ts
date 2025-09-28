import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModelV1 } from '@ai-sdk/provider';
import { LanguageModelV1Middleware, wrapLanguageModel } from 'ai';
import { ModelEnum, models } from './models';

export const Providers = {
  GOOGLE: 'google',
  OPENROUTER: 'openrouter',
} as const;

export type ProviderEnumType = (typeof Providers)[keyof typeof Providers];

export class MissingProviderKeyError extends Error {
  constructor(provider: ProviderEnumType) {
    const providerName = provider === Providers.GOOGLE ? 'Google Gemini' : 'OpenRouter';
    const envHint =
      provider === Providers.GOOGLE
        ? 'Set the GEMINI_API_KEY environment variable or provide a personal key in Settings → API Keys.'
        : 'Set the OPENROUTER_API_KEY environment variable or provide a personal key in Settings → API Keys.';
    super(`Missing ${providerName} API credentials. ${envHint}`);
    this.name = 'MissingProviderKeyError';
  }
}

// Define a global type for API keys
declare global {
  interface Window {
    AI_API_KEYS?: {
      [key in ProviderEnumType]?: string;
    };
    LANGSEARCH_API_KEY?: string;
    SERPER_API_KEY?: string;
    JINA_API_KEY?: string;
    NEXT_PUBLIC_APP_URL?: string;
  }
}

// Helper function to get API key from env or global
const getApiKey = (provider: ProviderEnumType): string => {
  // For server environments
  if (typeof process !== 'undefined' && process.env) {
    switch (provider) {
      case Providers.GOOGLE:
        if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
        break;
      case Providers.OPENROUTER:
        if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
        break;
    }
  }

  // For worker environments (use self)
  if (typeof self !== 'undefined') {
    // Check if AI_API_KEYS exists on self
    if ((self as any).AI_API_KEYS && (self as any).AI_API_KEYS[provider]) {
      return (self as any).AI_API_KEYS[provider];
    }
    
    // For browser environments (self is also defined in browser)
    if (typeof window !== 'undefined' && window.AI_API_KEYS) {
      return window.AI_API_KEYS[provider] || '';
    }
  }

  return '';
};

const getOpenRouterHeaders = () => {
  const headers: Record<string, string> = {};

  const referer =
    (typeof process !== 'undefined' && process.env?.OPENROUTER_SITE_URL) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_URL) ||
    (typeof window !== 'undefined' && window.NEXT_PUBLIC_APP_URL) ||
    '';

  const title =
    (typeof process !== 'undefined' && process.env?.OPENROUTER_APP_TITLE) ||
    'LLMChat';

  if (referer) {
    headers['HTTP-Referer'] = referer;
  }

  if (title) {
    headers['X-Title'] = title;
  }

  return headers;
};

export const getProviderInstance = (provider: ProviderEnumType) => {
  switch (provider) {
    case 'google':
      {
        const apiKey = getApiKey(Providers.GOOGLE);
        if (!apiKey) {
          throw new MissingProviderKeyError(Providers.GOOGLE);
        }
      return createGoogleGenerativeAI({
        apiKey,
      });
      }
    case Providers.OPENROUTER:
      {
        const apiKey = getApiKey(Providers.OPENROUTER);
        if (!apiKey) {
          throw new MissingProviderKeyError(Providers.OPENROUTER);
        }
      return createOpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        compatibility: 'strict',
        headers: getOpenRouterHeaders(),
      });
      }
    default:
      {
        const apiKey = getApiKey(Providers.OPENROUTER);
        if (!apiKey) {
          throw new MissingProviderKeyError(Providers.OPENROUTER);
        }
        return createOpenAI({
          apiKey,
        });
      }
  }
};

export const getLanguageModel = (m: ModelEnum, middleware?: LanguageModelV1Middleware) => {
  const model = models.find(model => model.id === m);
  const instance = getProviderInstance(model?.provider as ProviderEnumType);
  const selectedModel = instance(model?.id || 'gpt-4o-mini')
  if(middleware) {
    return wrapLanguageModel({model: selectedModel, middleware }) as LanguageModelV1;
  }
  return selectedModel as LanguageModelV1;
};
