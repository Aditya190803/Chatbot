/**
 * Langfuse Integration
 * 
 * This module provides integration with Langfuse for observability and analytics
 * of LLM interactions, including tracing, logging, and performance monitoring.
 */

import { Langfuse } from 'langfuse';

// Initialize Langfuse client
export const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_HOST || 'https://us.cloud.langfuse.com',
  flushAt: 1, // Send events immediately in development
  flushInterval: 1000, // Flush every second
});

// Langfuse configuration
export const langfuseConfig = {
  enabled: !!(process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY),
  environment: process.env.LANGFUSE_ENVIRONMENT || 'development',
  debug: process.env.NODE_ENV === 'development',
};

/**
 * Create a new trace for a conversation/thread
 */
export const createTrace = (threadId: string, userId?: string) => {
  if (!langfuseConfig.enabled) return null;
  
  return langfuse.trace({
    id: threadId,
    userId: userId,
    metadata: {
      environment: langfuseConfig.environment,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Log a chat generation with input/output
 */
export const logGeneration = (params: {
  traceId: string;
  name: string;
  model: string;
  input: any;
  output?: any;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  startTime?: Date;
  endTime?: Date;
  metadata?: Record<string, any>;
}) => {
  if (!langfuseConfig.enabled) return null;

  return langfuse.generation({
    traceId: params.traceId,
    name: params.name,
    model: params.model,
    input: params.input,
    output: params.output,
    usage: params.usage,
    startTime: params.startTime,
    endTime: params.endTime,
    metadata: {
      ...params.metadata,
      environment: langfuseConfig.environment,
    },
  });
};

/**
 * Log a user event/interaction
 */
export const logEvent = (params: {
  traceId: string;
  name: string;
  input?: any;
  output?: any;
  metadata?: Record<string, any>;
}) => {
  if (!langfuseConfig.enabled) return null;

  return langfuse.event({
    traceId: params.traceId,
    name: params.name,
    input: params.input,
    output: params.output,
    metadata: {
      ...params.metadata,
      environment: langfuseConfig.environment,
    },
  });
};

/**
 * Log an error
 */
export const logError = (params: {
  traceId: string;
  error: Error;
  context?: Record<string, any>;
}) => {
  if (!langfuseConfig.enabled) return null;

  return langfuse.event({
    traceId: params.traceId,
    name: 'error',
    input: {
      error: {
        name: params.error.name,
        message: params.error.message,
        stack: params.error.stack,
      },
      context: params.context,
    },
    metadata: {
      environment: langfuseConfig.environment,
      level: 'error',
    },
  });
};

/**
 * Flush all pending events (call this before application shutdown)
 */
export const flushLangfuse = async () => {
  if (!langfuseConfig.enabled) return;
  
  try {
    await langfuse.flushAsync();
    console.log('Langfuse events flushed successfully');
  } catch (error) {
    console.error('Failed to flush Langfuse events:', error);
  }
};

/**
 * Score a generation (for feedback/rating)
 */
export const scoreGeneration = (params: {
  traceId: string;
  generationId: string;
  name: string;
  value: number;
  comment?: string;
}) => {
  if (!langfuseConfig.enabled) return null;

  return langfuse.score({
    traceId: params.traceId,
    observationId: params.generationId,
    name: params.name,
    value: params.value,
    comment: params.comment,
  });
};

// Debug logging
if (langfuseConfig.debug) {
  console.log('Langfuse configuration:', {
    enabled: langfuseConfig.enabled,
    environment: langfuseConfig.environment,
    host: process.env.LANGFUSE_HOST,
    hasKeys: !!(process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY),
  });
}

export default langfuse;