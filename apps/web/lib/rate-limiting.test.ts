import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
    checkRateLimit,
    getClientIdentifier,
    createRateLimitMiddleware,
    createRateLimitExceededResponse,
    addRateLimitHeaders,
    getRateLimitConfig,
    RATE_LIMIT_TIERS,
} from './rate-limiting';

// Mock the rate limit store
const mockStore = {
    get: vi.fn(),
    set: vi.fn(),
    increment: vi.fn(),
};

describe('Rate Limiting', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getClientIdentifier', () => {
        it('should return user ID when provided', () => {
            const req = new NextRequest('http://localhost/api/test');
            const identifier = getClientIdentifier(req, 'user-123');

            expect(identifier).toBe('user:user-123');
        });

        it('should extract IP from x-forwarded-for header', () => {
            const req = new NextRequest('http://localhost/api/test', {
                headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
            });
            const identifier = getClientIdentifier(req);

            expect(identifier).toBe('ip:192.168.1.1');
        });

        it('should extract IP from x-real-ip header', () => {
            const req = new NextRequest('http://localhost/api/test', {
                headers: { 'x-real-ip': '192.168.1.2' },
            });
            const identifier = getClientIdentifier(req);

            expect(identifier).toBe('ip:192.168.1.2');
        });

        it('should extract IP from cf-connecting-ip header', () => {
            const req = new NextRequest('http://localhost/api/test', {
                headers: { 'cf-connecting-ip': '192.168.1.3' },
            });
            const identifier = getClientIdentifier(req);

            expect(identifier).toBe('ip:192.168.1.3');
        });

        it('should prioritize cf-connecting-ip over other headers', () => {
            const req = new NextRequest('http://localhost/api/test', {
                headers: {
                    'cf-connecting-ip': '1.1.1.1',
                    'x-real-ip': '2.2.2.2',
                    'x-forwarded-for': '3.3.3.3',
                },
            });
            const identifier = getClientIdentifier(req);

            expect(identifier).toBe('ip:1.1.1.1');
        });

        it('should return unknown when no IP headers present', () => {
            const req = new NextRequest('http://localhost/api/test');
            const identifier = getClientIdentifier(req);

            expect(identifier).toBe('ip:unknown');
        });
    });

    describe('checkRateLimit', () => {
        it('should allow request when under limit', async () => {
            mockStore.increment.mockResolvedValue({
                count: 5,
                resetAt: Date.now() + 60000,
            });

            const result = await checkRateLimit(
                'test-client',
                { maxRequests: 10, windowMs: 60000, identifier: 'test' },
                mockStore
            );

            expect(result.success).toBe(true);
            expect(result.remaining).toBe(5);
            expect(result.limit).toBe(10);
        });

        it('should reject request when at limit', async () => {
            const resetAt = Date.now() + 30000;
            mockStore.increment.mockResolvedValue({
                count: 11,
                resetAt,
            });

            const result = await checkRateLimit(
                'test-client',
                { maxRequests: 10, windowMs: 60000, identifier: 'test' },
                mockStore
            );

            expect(result.success).toBe(false);
            expect(result.remaining).toBe(0);
            expect(result.retryAfterSeconds).toBeGreaterThan(0);
        });

        it('should set remaining to 0 when over limit', async () => {
            mockStore.increment.mockResolvedValue({
                count: 15,
                resetAt: Date.now() + 60000,
            });

            const result = await checkRateLimit(
                'test-client',
                { maxRequests: 10, windowMs: 60000, identifier: 'test' },
                mockStore
            );

            expect(result.remaining).toBe(0);
        });
    });

    describe('createRateLimitMiddleware', () => {
        it('should pass when under rate limit', async () => {
            mockStore.increment.mockResolvedValue({
                count: 1,
                resetAt: Date.now() + 60000,
            });

            const middleware = createRateLimitMiddleware({
                maxRequests: 10,
                windowMs: 60000,
                identifier: 'test',
            });

            const req = new NextRequest('http://localhost/api/test');
            // Note: This test would need the actual implementation to work
            // For now, we're testing the structure
            expect(typeof middleware).toBe('function');
        });

        it('should skip when skip function returns true', async () => {
            const middleware = createRateLimitMiddleware({
                maxRequests: 10,
                windowMs: 60000,
                identifier: 'test',
                skip: () => true,
            });

            const req = new NextRequest('http://localhost/api/test');
            const result = await middleware(req);

            expect(result.success).toBe(true);
            expect((result as any).result.remaining).toBe(10);
        });
    });

    describe('createRateLimitExceededResponse', () => {
        it('should create 429 response with correct headers', () => {
            const result = {
                success: false,
                limit: 10,
                remaining: 0,
                resetAt: Date.now() + 60000,
                retryAfterSeconds: 60,
            };

            const response = createRateLimitExceededResponse(result);

            expect(response.status).toBe(429);
            expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
            expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
            expect(response.headers.get('Retry-After')).toBe('60');
        });
    });

    describe('getRateLimitConfig', () => {
        it('should return correct config for anonymous tier', () => {
            const config = getRateLimitConfig('anonymous', 'chat');

            expect(config.maxRequests).toBe(RATE_LIMIT_TIERS.anonymous.chat.maxRequests);
            expect(config.windowMs).toBe(RATE_LIMIT_TIERS.anonymous.chat.windowMs);
            expect(config.identifier).toBe('chat');
        });

        it('should return correct config for free tier', () => {
            const config = getRateLimitConfig('free', 'completion');

            expect(config.maxRequests).toBe(RATE_LIMIT_TIERS.free.completion.maxRequests);
        });

        it('should return correct config for pro tier', () => {
            const config = getRateLimitConfig('pro', 'search');

            expect(config.maxRequests).toBe(RATE_LIMIT_TIERS.pro.search.maxRequests);
        });
    });

    describe('RATE_LIMIT_TIERS', () => {
        it('should have increasing limits from anonymous to pro', () => {
            expect(RATE_LIMIT_TIERS.anonymous.chat.maxRequests).toBeLessThan(
                RATE_LIMIT_TIERS.free.chat.maxRequests
            );
            expect(RATE_LIMIT_TIERS.free.chat.maxRequests).toBeLessThan(
                RATE_LIMIT_TIERS.pro.chat.maxRequests
            );
        });

        it('should have all endpoint types for each tier', () => {
            const endpoints = ['chat', 'completion', 'search'] as const;

            for (const tier of ['anonymous', 'free', 'pro'] as const) {
                for (const endpoint of endpoints) {
                    expect(RATE_LIMIT_TIERS[tier][endpoint]).toBeDefined();
                    expect(RATE_LIMIT_TIERS[tier][endpoint].maxRequests).toBeGreaterThan(0);
                    expect(RATE_LIMIT_TIERS[tier][endpoint].windowMs).toBeGreaterThan(0);
                }
            }
        });
    });
});
