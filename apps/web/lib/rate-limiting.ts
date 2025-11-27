import { NextRequest, NextResponse } from 'next/server';

export interface RateLimitConfig {
    /** Maximum requests allowed in the window */
    maxRequests: number;
    /** Time window in milliseconds */
    windowMs: number;
    /** Identifier for the rate limit bucket (e.g., 'chat', 'api') */
    identifier: string;
    /** Skip rate limiting for certain conditions */
    skip?: (req: NextRequest) => boolean;
}

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfterSeconds?: number;
}

export interface RateLimitStore {
    get(key: string): Promise<RateLimitEntry | null>;
    set(key: string, entry: RateLimitEntry, ttlMs: number): Promise<void>;
    increment(key: string, windowMs: number, maxRequests: number): Promise<RateLimitEntry>;
}

export interface RateLimitEntry {
    count: number;
    resetAt: number;
}

// Default rate limits by tier
export const RATE_LIMIT_TIERS = {
    anonymous: {
        chat: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
        completion: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
        search: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 per minute
    },
    free: {
        chat: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
        completion: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
        search: { maxRequests: 50, windowMs: 60 * 1000 }, // 50 per minute
    },
    pro: {
        chat: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 per minute
        completion: { maxRequests: 200, windowMs: 60 * 1000 }, // 200 per minute
        search: { maxRequests: 150, windowMs: 60 * 1000 }, // 150 per minute
    },
} as const;

export type RateLimitTier = keyof typeof RATE_LIMIT_TIERS;
export type RateLimitEndpoint = keyof typeof RATE_LIMIT_TIERS.anonymous;

/**
 * In-memory rate limit store (for single-instance deployments)
 * For production with multiple instances, use Redis
 */
class InMemoryRateLimitStore implements RateLimitStore {
    private store: Map<string, RateLimitEntry> = new Map();
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        // Clean up expired entries every minute
        if (typeof setInterval !== 'undefined') {
            this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
        }
    }

    async get(key: string): Promise<RateLimitEntry | null> {
        const entry = this.store.get(key);
        if (!entry) return null;
        
        // Check if entry has expired
        if (Date.now() > entry.resetAt) {
            this.store.delete(key);
            return null;
        }
        
        return entry;
    }

    async set(key: string, entry: RateLimitEntry, _ttlMs: number): Promise<void> {
        this.store.set(key, entry);
    }

    async increment(key: string, windowMs: number, _maxRequests: number): Promise<RateLimitEntry> {
        const now = Date.now();
        const existing = await this.get(key);

        if (existing && now < existing.resetAt) {
            // Window is still active, increment count
            existing.count++;
            this.store.set(key, existing);
            return existing;
        }

        // Start a new window
        const newEntry: RateLimitEntry = {
            count: 1,
            resetAt: now + windowMs,
        };
        this.store.set(key, newEntry);
        return newEntry;
    }

    private cleanup(): void {
        const now = Date.now();
        const entries = Array.from(this.store.entries());
        entries.forEach(([key, entry]) => {
            if (now > entry.resetAt) {
                this.store.delete(key);
            }
        });
    }

    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.store.clear();
    }
}

// Singleton store instance
let rateLimitStore: RateLimitStore | null = null;

export function getRateLimitStore(): RateLimitStore {
    if (!rateLimitStore) {
        rateLimitStore = new InMemoryRateLimitStore();
    }
    return rateLimitStore;
}

/**
 * Extract client identifier from request (IP address or user ID)
 */
export function getClientIdentifier(req: NextRequest, userId?: string | null): string {
    if (userId) {
        return `user:${userId}`;
    }

    // Try to get real IP from various headers
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    
    const ip = cfConnectingIp || realIp || forwarded?.split(',')[0]?.trim() || 'unknown';
    return `ip:${ip}`;
}

/**
 * Check rate limit for a request
 */
export async function checkRateLimit(
    clientId: string,
    config: RateLimitConfig,
    store: RateLimitStore = getRateLimitStore()
): Promise<RateLimitResult> {
    const key = `ratelimit:${config.identifier}:${clientId}`;
    
    const entry = await store.increment(key, config.windowMs, config.maxRequests);
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const success = entry.count <= config.maxRequests;

    const result: RateLimitResult = {
        success,
        limit: config.maxRequests,
        remaining,
        resetAt: entry.resetAt,
    };

    if (!success) {
        result.retryAfterSeconds = Math.ceil((entry.resetAt - Date.now()) / 1000);
    }

    return result;
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
    response: NextResponse,
    result: RateLimitResult
): NextResponse {
    response.headers.set('X-RateLimit-Limit', result.limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString());

    if (result.retryAfterSeconds !== undefined) {
        response.headers.set('Retry-After', result.retryAfterSeconds.toString());
    }

    return response;
}

/**
 * Create a rate limit exceeded response
 */
export function createRateLimitExceededResponse(result: RateLimitResult): NextResponse {
    const response = NextResponse.json(
        {
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please slow down and try again later.',
            retryAfter: result.retryAfterSeconds,
            resetAt: new Date(result.resetAt).toISOString(),
        },
        { status: 429 }
    );

    return addRateLimitHeaders(response, result);
}

/**
 * Rate limit middleware factory
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
    return async function rateLimitMiddleware(
        req: NextRequest,
        userId?: string | null
    ): Promise<{ success: true; result: RateLimitResult } | { success: false; response: NextResponse }> {
        // Check if rate limiting should be skipped
        if (config.skip?.(req)) {
            return {
                success: true,
                result: {
                    success: true,
                    limit: config.maxRequests,
                    remaining: config.maxRequests,
                    resetAt: Date.now() + config.windowMs,
                },
            };
        }

        const clientId = getClientIdentifier(req, userId);
        const result = await checkRateLimit(clientId, config);

        if (!result.success) {
            return {
                success: false,
                response: createRateLimitExceededResponse(result),
            };
        }

        return { success: true, result };
    };
}

/**
 * Get rate limit config for a specific tier and endpoint
 */
export function getRateLimitConfig(
    tier: RateLimitTier,
    endpoint: RateLimitEndpoint
): RateLimitConfig {
    const limits = RATE_LIMIT_TIERS[tier][endpoint];
    return {
        ...limits,
        identifier: endpoint,
    };
}

/**
 * Wrapper to apply rate limiting to an API route handler
 */
export function withRateLimit<T extends NextResponse>(
    config: RateLimitConfig,
    handler: (req: NextRequest, rateLimitResult: RateLimitResult) => Promise<T>
) {
    const middleware = createRateLimitMiddleware(config);

    return async function rateLimitedHandler(req: NextRequest): Promise<NextResponse> {
        const rateLimitCheck = await middleware(req);

        if (!rateLimitCheck.success) {
            return rateLimitCheck.response;
        }

        const response = await handler(req, rateLimitCheck.result);
        return addRateLimitHeaders(response, rateLimitCheck.result);
    };
}
