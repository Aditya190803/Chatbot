export enum ErrorCategory {
    NETWORK = 'NETWORK',
    AUTHENTICATION = 'AUTHENTICATION',
    AUTHORIZATION = 'AUTHORIZATION',
    VALIDATION = 'VALIDATION',
    RATE_LIMIT = 'RATE_LIMIT',
    SERVER = 'SERVER',
    CLIENT = 'CLIENT',
    TIMEOUT = 'TIMEOUT',
    UNKNOWN = 'UNKNOWN',
}

export interface AppError {
    category: ErrorCategory;
    code: string;
    message: string;
    userMessage: string;
    retryable: boolean;
    originalError?: unknown;
    context?: Record<string, unknown>;
}

export interface RetryConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    retryableCategories: ErrorCategory[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableCategories: [
        ErrorCategory.NETWORK,
        ErrorCategory.TIMEOUT,
        ErrorCategory.SERVER,
        ErrorCategory.RATE_LIMIT,
    ],
};

/**
 * User-friendly error messages by category
 */
const USER_FRIENDLY_MESSAGES: Record<ErrorCategory, string> = {
    [ErrorCategory.NETWORK]: 'Unable to connect. Please check your internet connection and try again.',
    [ErrorCategory.AUTHENTICATION]: 'Your session has expired. Please sign in again.',
    [ErrorCategory.AUTHORIZATION]: 'You don\'t have permission to perform this action.',
    [ErrorCategory.VALIDATION]: 'Please check your input and try again.',
    [ErrorCategory.RATE_LIMIT]: 'Too many requests. Please wait a moment and try again.',
    [ErrorCategory.SERVER]: 'Something went wrong on our end. Please try again later.',
    [ErrorCategory.CLIENT]: 'Something went wrong. Please refresh the page and try again.',
    [ErrorCategory.TIMEOUT]: 'The request took too long. Please try again.',
    [ErrorCategory.UNKNOWN]: 'An unexpected error occurred. Please try again.',
};

/**
 * Categorize an error based on its properties
 */
export function categorizeError(error: unknown): ErrorCategory {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        const name = error.name.toLowerCase();

        // Network errors
        if (
            message.includes('network') ||
            message.includes('fetch') ||
            message.includes('failed to fetch') ||
            message.includes('net::') ||
            name.includes('networkerror')
        ) {
            return ErrorCategory.NETWORK;
        }

        // Timeout errors
        if (
            message.includes('timeout') ||
            message.includes('timed out') ||
            name.includes('timeout')
        ) {
            return ErrorCategory.TIMEOUT;
        }

        // Rate limit errors
        if (
            message.includes('rate limit') ||
            message.includes('too many requests') ||
            message.includes('429')
        ) {
            return ErrorCategory.RATE_LIMIT;
        }

        // Authentication errors
        if (
            message.includes('unauthorized') ||
            message.includes('unauthenticated') ||
            message.includes('401')
        ) {
            return ErrorCategory.AUTHENTICATION;
        }

        // Authorization errors
        if (
            message.includes('forbidden') ||
            message.includes('permission') ||
            message.includes('403')
        ) {
            return ErrorCategory.AUTHORIZATION;
        }

        // Validation errors
        if (
            message.includes('validation') ||
            message.includes('invalid') ||
            message.includes('400')
        ) {
            return ErrorCategory.VALIDATION;
        }

        // Server errors
        if (
            message.includes('500') ||
            message.includes('502') ||
            message.includes('503') ||
            message.includes('504') ||
            message.includes('server error')
        ) {
            return ErrorCategory.SERVER;
        }
    }

    // Check for HTTP response errors
    if (typeof error === 'object' && error !== null) {
        const errorObj = error as Record<string, unknown>;
        const status = errorObj.status || errorObj.statusCode;
        
        if (typeof status === 'number') {
            if (status === 401) return ErrorCategory.AUTHENTICATION;
            if (status === 403) return ErrorCategory.AUTHORIZATION;
            if (status === 429) return ErrorCategory.RATE_LIMIT;
            if (status >= 400 && status < 500) return ErrorCategory.CLIENT;
            if (status >= 500) return ErrorCategory.SERVER;
        }
    }

    return ErrorCategory.UNKNOWN;
}

/**
 * Create a standardized AppError from any error type
 */
export function createAppError(
    error: unknown,
    context?: Record<string, unknown>
): AppError {
    const category = categorizeError(error);
    const isRetryable = DEFAULT_RETRY_CONFIG.retryableCategories.includes(category);

    let message = 'An unknown error occurred';
    let code = 'UNKNOWN_ERROR';

    if (error instanceof Error) {
        message = error.message;
        code = error.name.toUpperCase().replace(/\s+/g, '_');
    } else if (typeof error === 'string') {
        message = error;
        code = 'STRING_ERROR';
    } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as Record<string, unknown>;
        message = String(errorObj.message || errorObj.error || JSON.stringify(error));
        code = String(errorObj.code || 'OBJECT_ERROR');
    }

    return {
        category,
        code,
        message,
        userMessage: USER_FRIENDLY_MESSAGES[category],
        retryable: isRetryable,
        originalError: error,
        context,
    };
}

/**
 * Calculate delay for exponential backoff
 */
export function calculateBackoffDelay(
    attempt: number,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
    const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
    // Add jitter (±10%) to prevent thundering herd
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    return Math.min(delay + jitter, config.maxDelayMs);
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
): Promise<T> {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: AppError | null = null;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const appError = createAppError(error, { attempt });
            lastError = appError;

            // Don't retry if error is not retryable or we've exhausted retries
            if (
                !appError.retryable ||
                !finalConfig.retryableCategories.includes(appError.category) ||
                attempt >= finalConfig.maxRetries
            ) {
                throw appError;
            }

            // Wait before retrying
            const delay = calculateBackoffDelay(attempt, finalConfig);
            await sleep(delay);
        }
    }

    throw lastError || createAppError(new Error('Max retries exceeded'));
}

/**
 * Create a retry wrapper that provides status updates
 */
export function createRetryHandler<T>(
    fn: () => Promise<T>,
    options: {
        config?: Partial<RetryConfig>;
        onRetry?: (attempt: number, error: AppError, delayMs: number) => void;
        onSuccess?: (result: T, attempts: number) => void;
        onFailure?: (error: AppError, attempts: number) => void;
    } = {}
): Promise<T> {
    const { config = {}, onRetry, onSuccess, onFailure } = options;
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let attempts = 0;

    const execute = async (): Promise<T> => {
        try {
            attempts++;
            const result = await fn();
            onSuccess?.(result, attempts);
            return result;
        } catch (error) {
            const appError = createAppError(error, { attempt: attempts });

            if (
                appError.retryable &&
                finalConfig.retryableCategories.includes(appError.category) &&
                attempts <= finalConfig.maxRetries
            ) {
                const delay = calculateBackoffDelay(attempts - 1, finalConfig);
                onRetry?.(attempts, appError, delay);
                await sleep(delay);
                return execute();
            }

            onFailure?.(appError, attempts);
            throw appError;
        }
    };

    return execute();
}

/**
 * Error boundary helper for async operations
 */
export async function safeAsync<T>(
    fn: () => Promise<T>,
    fallback: T
): Promise<{ data: T; error: AppError | null }> {
    try {
        const data = await fn();
        return { data, error: null };
    } catch (error) {
        const appError = createAppError(error);
        return { data: fallback, error: appError };
    }
}

/**
 * Get appropriate action text for an error
 */
export function getErrorActionText(category: ErrorCategory): string {
    switch (category) {
        case ErrorCategory.NETWORK:
            return 'Check connection';
        case ErrorCategory.AUTHENTICATION:
            return 'Sign in';
        case ErrorCategory.AUTHORIZATION:
            return 'Request access';
        case ErrorCategory.RATE_LIMIT:
            return 'Wait and retry';
        case ErrorCategory.TIMEOUT:
            return 'Try again';
        case ErrorCategory.SERVER:
            return 'Try again later';
        case ErrorCategory.VALIDATION:
            return 'Fix and retry';
        default:
            return 'Try again';
    }
}

/**
 * Check if an error should trigger a redirect to sign-in
 */
export function shouldRedirectToSignIn(error: AppError): boolean {
    return error.category === ErrorCategory.AUTHENTICATION;
}

/**
 * Format error for display in toast/notification
 */
export function formatErrorForToast(error: AppError): {
    title: string;
    description: string;
    action?: string;
} {
    const titles: Record<ErrorCategory, string> = {
        [ErrorCategory.NETWORK]: 'Connection Error',
        [ErrorCategory.AUTHENTICATION]: 'Session Expired',
        [ErrorCategory.AUTHORIZATION]: 'Access Denied',
        [ErrorCategory.VALIDATION]: 'Invalid Input',
        [ErrorCategory.RATE_LIMIT]: 'Slow Down',
        [ErrorCategory.SERVER]: 'Server Error',
        [ErrorCategory.CLIENT]: 'Error',
        [ErrorCategory.TIMEOUT]: 'Request Timeout',
        [ErrorCategory.UNKNOWN]: 'Error',
    };

    return {
        title: titles[error.category],
        description: error.userMessage,
        action: error.retryable ? getErrorActionText(error.category) : undefined,
    };
}
