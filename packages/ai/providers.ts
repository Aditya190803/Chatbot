import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModelV1 } from '@ai-sdk/provider';
import { LanguageModelV1Middleware, wrapLanguageModel } from 'ai';
import { ModelEnum, models } from './models';

// Simple in-memory caches to avoid recreating provider/model instances repeatedly.
const providerInstanceCache: Map<ProviderEnumType, any> = new Map();
const modelInstanceCache: Map<string, any> = new Map();

// Track cached API key signatures to detect changes
let cachedKeySignature: string | null = null;

// Clear all provider and model caches (useful when API keys change)
export const clearProviderCaches = () => {
  providerInstanceCache.clear();
  modelInstanceCache.clear();
  cachedKeySignature = null;
};

// Check if API keys have changed and clear caches if needed
const invalidateCachesIfKeysChanged = () => {
  const currentSignature = computeKeySignature();
  if (cachedKeySignature !== null && cachedKeySignature !== currentSignature) {
    clearProviderCaches();
  }
  cachedKeySignature = currentSignature;
};

// Compute a signature based on current API keys
const computeKeySignature = (): string => {
  const parts: string[] = [];
  
  // Check process.env
  if (typeof process !== 'undefined' && process.env) {
    parts.push(process.env.GEMINI_API_KEY || '');
    parts.push(process.env.OPENROUTER_API_KEY || '');
  }
  
  // Check self.AI_API_KEYS (worker environment)
  if (typeof self !== 'undefined' && (self as any).AI_API_KEYS) {
    parts.push((self as any).AI_API_KEYS.google || '');
    parts.push((self as any).AI_API_KEYS.openrouter || '');
  }
  
  // Check window.AI_API_KEYS (browser environment)
  if (typeof window !== 'undefined' && window.AI_API_KEYS) {
    parts.push(window.AI_API_KEYS.google || '');
    parts.push(window.AI_API_KEYS.openrouter || '');
  }
  
  return parts.join('|');
};

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
export const getProviderApiKey = (provider: ProviderEnumType): string => {
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

const resolveAppOrigin = () => {
  const envOrigin =
    (typeof process !== 'undefined' &&
      (process.env?.OPENROUTER_SITE_URL ||
        process.env?.NEXT_PUBLIC_APP_URL ||
        (process.env?.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined))) ||
    undefined;

  if (envOrigin) {
    return envOrigin;
  }

  if (typeof window !== 'undefined') {
    if ((window as any).NEXT_PUBLIC_APP_URL) {
      return (window as any).NEXT_PUBLIC_APP_URL;
    }

    if (window.location?.origin) {
      return window.location.origin;
    }
  }

  if (typeof self !== 'undefined' && (self as any).location?.origin) {
    return (self as any).location.origin;
  }

  return 'http://localhost:3000';
};

const getOpenRouterHeaders = () => {
  const headers: Record<string, string> = {};

  const referer = resolveAppOrigin();
  const title =
    (typeof process !== 'undefined' && process.env?.OPENROUTER_APP_TITLE) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_NAME) ||
    'Chatbot';

  if (referer) {
    headers['HTTP-Referer'] = referer;
  }

  if (title) {
    headers['X-Title'] = title;
  }

  return headers;
};

export const getProviderInstance = (provider: ProviderEnumType) => {
  // Check if API keys have changed and invalidate caches if needed
  invalidateCachesIfKeysChanged();
  
  // Return cached provider instance if available
  if (providerInstanceCache.has(provider)) {
    return providerInstanceCache.get(provider);
  }

  let created: any;
  switch (provider) {
    case Providers.GOOGLE: {
      const apiKey = getProviderApiKey(Providers.GOOGLE);
      if (!apiKey) {
        throw new MissingProviderKeyError(Providers.GOOGLE);
      }
      created = createGoogleGenerativeAI({
        apiKey,
      });
      break;
    }
    case Providers.OPENROUTER: {
      const apiKey = getProviderApiKey(Providers.OPENROUTER);
      if (!apiKey) {
        throw new MissingProviderKeyError(Providers.OPENROUTER);
      }
      created = createOpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        headers: getOpenRouterHeaders(),
      });
      break;
    }
    default: {
      const apiKey = getProviderApiKey(Providers.OPENROUTER);
      if (!apiKey) {
        throw new MissingProviderKeyError(Providers.OPENROUTER);
      }
      created = createOpenAI({
        apiKey,
      });
      break;
    }
  }

  // Cache and return
  providerInstanceCache.set(provider, created);
  return created;
};

export const getLanguageModel = (m: ModelEnum, middleware?: LanguageModelV1Middleware): any => {
  const model = models.find(model => model.id === m);
  const instance = getProviderInstance(model?.provider as ProviderEnumType);

  // Try to reuse a created model instance for this model id
  const modelKey = String(model?.id || 'unknown-model');
  let baseModel = modelInstanceCache.get(modelKey);
  if (!baseModel) {
    baseModel = instance(model?.id || 'gpt-4o-mini');
    modelInstanceCache.set(modelKey, baseModel);
  }

  // If middleware is provided, wrap on-the-fly (do not cache wrapped instances as middleware can vary)
  if (middleware) {
    return wrapLanguageModel({ model: baseModel, middleware });
  }
  return baseModel;
};
