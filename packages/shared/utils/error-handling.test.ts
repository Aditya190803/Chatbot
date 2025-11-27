import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    categorizeError,
    createAppError,
    calculateBackoffDelay,
    withRetry,
    safeAsync,
    formatErrorForToast,
    ErrorCategory,
    DEFAULT_RETRY_CONFIG,
    shouldRedirectToSignIn,
    getErrorActionText,
} from './error-handling';

describe('error-handling', () => {
    describe('categorizeError', () => {
        it('should categorize network errors', () => {
            expect(categorizeError(new Error('Network error'))).toBe(ErrorCategory.NETWORK);
            expect(categorizeError(new Error('Failed to fetch'))).toBe(ErrorCategory.NETWORK);
            expect(categorizeError(new Error('net::ERR_CONNECTION_REFUSED'))).toBe(ErrorCategory.NETWORK);
        });

        it('should categorize timeout errors', () => {
            expect(categorizeError(new Error('Request timeout'))).toBe(ErrorCategory.TIMEOUT);
            expect(categorizeError(new Error('Connection timed out'))).toBe(ErrorCategory.TIMEOUT);
        });

        it('should categorize rate limit errors', () => {
            expect(categorizeError(new Error('Rate limit exceeded'))).toBe(ErrorCategory.RATE_LIMIT);
            expect(categorizeError(new Error('Too many requests'))).toBe(ErrorCategory.RATE_LIMIT);
            expect(categorizeError(new Error('429'))).toBe(ErrorCategory.RATE_LIMIT);
        });

        it('should categorize authentication errors', () => {
            expect(categorizeError(new Error('Unauthorized'))).toBe(ErrorCategory.AUTHENTICATION);
            expect(categorizeError(new Error('401'))).toBe(ErrorCategory.AUTHENTICATION);
        });

        it('should categorize authorization errors', () => {
            expect(categorizeError(new Error('Forbidden'))).toBe(ErrorCategory.AUTHORIZATION);
            expect(categorizeError(new Error('Permission denied'))).toBe(ErrorCategory.AUTHORIZATION);
            expect(categorizeError(new Error('403'))).toBe(ErrorCategory.AUTHORIZATION);
        });

        it('should categorize validation errors', () => {
            expect(categorizeError(new Error('Validation failed'))).toBe(ErrorCategory.VALIDATION);
            expect(categorizeError(new Error('Invalid input'))).toBe(ErrorCategory.VALIDATION);
            expect(categorizeError(new Error('400'))).toBe(ErrorCategory.VALIDATION);
        });

        it('should categorize server errors', () => {
            expect(categorizeError(new Error('500 Internal Server Error'))).toBe(ErrorCategory.SERVER);
            expect(categorizeError(new Error('502 Bad Gateway'))).toBe(ErrorCategory.SERVER);
            expect(categorizeError(new Error('503 Service Unavailable'))).toBe(ErrorCategory.SERVER);
        });

        it('should categorize errors from status codes', () => {
            expect(categorizeError({ status: 401 })).toBe(ErrorCategory.AUTHENTICATION);
            expect(categorizeError({ status: 403 })).toBe(ErrorCategory.AUTHORIZATION);
            expect(categorizeError({ status: 429 })).toBe(ErrorCategory.RATE_LIMIT);
            expect(categorizeError({ statusCode: 500 })).toBe(ErrorCategory.SERVER);
        });

        it('should return UNKNOWN for unrecognized errors', () => {
            expect(categorizeError(new Error('Some random error'))).toBe(ErrorCategory.UNKNOWN);
            expect(categorizeError('string error')).toBe(ErrorCategory.UNKNOWN);
            expect(categorizeError(null)).toBe(ErrorCategory.UNKNOWN);
        });
    });

    describe('createAppError', () => {
        it('should create AppError from Error instance', () => {
            const error = new Error('Network error');
            const appError = createAppError(error);

            expect(appError.category).toBe(ErrorCategory.NETWORK);
            expect(appError.message).toBe('Network error');
            expect(appError.retryable).toBe(true);
            expect(appError.originalError).toBe(error);
        });

        it('should create AppError from string', () => {
            const appError = createAppError('Something went wrong');

            expect(appError.message).toBe('Something went wrong');
            expect(appError.code).toBe('STRING_ERROR');
        });

        it('should create AppError from object', () => {
            const appError = createAppError({ message: 'API error', code: 'API_ERROR' });

            expect(appError.message).toBe('API error');
            expect(appError.code).toBe('API_ERROR');
        });

        it('should include context when provided', () => {
            const appError = createAppError(new Error('Test'), { userId: '123' });

            expect(appError.context).toEqual({ userId: '123' });
        });

        it('should set retryable based on category', () => {
            expect(createAppError(new Error('Network error')).retryable).toBe(true);
            expect(createAppError(new Error('Timeout')).retryable).toBe(true);
            expect(createAppError(new Error('Unauthorized')).retryable).toBe(false);
            expect(createAppError(new Error('Forbidden')).retryable).toBe(false);
        });
    });

    describe('calculateBackoffDelay', () => {
        it('should calculate exponential backoff', () => {
            const config = { ...DEFAULT_RETRY_CONFIG, baseDelayMs: 1000, backoffMultiplier: 2 };

            // Allow for jitter (±10%)
            const delay0 = calculateBackoffDelay(0, config);
            expect(delay0).toBeGreaterThanOrEqual(900);
            expect(delay0).toBeLessThanOrEqual(1100);

            const delay1 = calculateBackoffDelay(1, config);
            expect(delay1).toBeGreaterThanOrEqual(1800);
            expect(delay1).toBeLessThanOrEqual(2200);

            const delay2 = calculateBackoffDelay(2, config);
            expect(delay2).toBeGreaterThanOrEqual(3600);
            expect(delay2).toBeLessThanOrEqual(4400);
        });

        it('should not exceed maxDelayMs', () => {
            const config = { ...DEFAULT_RETRY_CONFIG, maxDelayMs: 5000 };
            const delay = calculateBackoffDelay(10, config);

            expect(delay).toBeLessThanOrEqual(5500); // maxDelay + jitter
        });
    });

    describe('withRetry', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should return result on success', async () => {
            const fn = vi.fn().mockResolvedValue('success');
            const result = await withRetry(fn);

            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should retry on retryable errors', async () => {
            const fn = vi
                .fn()
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValue('success');

            const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 100 });

            // Fast-forward timers
            await vi.advanceTimersByTimeAsync(200);

            const result = await promise;
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(2);
        });

        it('should not retry on non-retryable errors', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('Unauthorized'));

            await expect(withRetry(fn)).rejects.toMatchObject({
                category: ErrorCategory.AUTHENTICATION,
            });
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should throw after max retries', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('Network error'));

            const promise = withRetry(fn, { maxRetries: 2, baseDelayMs: 100 });

            // Fast-forward all retries
            await vi.advanceTimersByTimeAsync(1000);

            await expect(promise).rejects.toMatchObject({
                category: ErrorCategory.NETWORK,
            });
            expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });
    });

    describe('safeAsync', () => {
        it('should return data on success', async () => {
            const fn = vi.fn().mockResolvedValue('result');
            const { data, error } = await safeAsync(fn, 'fallback');

            expect(data).toBe('result');
            expect(error).toBeNull();
        });

        it('should return fallback and error on failure', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('Failed'));
            const { data, error } = await safeAsync(fn, 'fallback');

            expect(data).toBe('fallback');
            expect(error).not.toBeNull();
            expect(error?.message).toBe('Failed');
        });
    });

    describe('formatErrorForToast', () => {
        it('should format network errors', () => {
            const appError = createAppError(new Error('Network error'));
            const toast = formatErrorForToast(appError);

            expect(toast.title).toBe('Connection Error');
            expect(toast.description).toContain('internet connection');
            expect(toast.action).toBe('Check connection');
        });

        it('should format authentication errors', () => {
            const appError = createAppError(new Error('Unauthorized'));
            const toast = formatErrorForToast(appError);

            expect(toast.title).toBe('Session Expired');
            // Auth errors are not retryable, so no action is provided
            expect(toast.action).toBeUndefined();
        });

        it('should format rate limit errors', () => {
            const appError = createAppError(new Error('Rate limit exceeded'));
            const toast = formatErrorForToast(appError);

            expect(toast.title).toBe('Slow Down');
            expect(toast.action).toBe('Wait and retry');
        });
    });

    describe('shouldRedirectToSignIn', () => {
        it('should return true for authentication errors', () => {
            const authError = createAppError(new Error('Unauthorized'));
            expect(shouldRedirectToSignIn(authError)).toBe(true);
        });

        it('should return false for other errors', () => {
            const networkError = createAppError(new Error('Network error'));
            expect(shouldRedirectToSignIn(networkError)).toBe(false);

            const serverError = createAppError(new Error('500'));
            expect(shouldRedirectToSignIn(serverError)).toBe(false);
        });
    });

    describe('getErrorActionText', () => {
        it('should return appropriate action text for each category', () => {
            expect(getErrorActionText(ErrorCategory.NETWORK)).toBe('Check connection');
            expect(getErrorActionText(ErrorCategory.AUTHENTICATION)).toBe('Sign in');
            expect(getErrorActionText(ErrorCategory.AUTHORIZATION)).toBe('Request access');
            expect(getErrorActionText(ErrorCategory.RATE_LIMIT)).toBe('Wait and retry');
            expect(getErrorActionText(ErrorCategory.TIMEOUT)).toBe('Try again');
            expect(getErrorActionText(ErrorCategory.SERVER)).toBe('Try again later');
            expect(getErrorActionText(ErrorCategory.VALIDATION)).toBe('Fix and retry');
            expect(getErrorActionText(ErrorCategory.UNKNOWN)).toBe('Try again');
        });
    });
});
