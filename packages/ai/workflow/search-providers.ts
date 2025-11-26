import { logger } from '@repo/shared/logger';

export type Geo = {
    country?: string;
    city?: string;
};

export type SearchResult = {
    title: string;
    link: string;
    snippet?: string;
};

export interface SearchProvider {
    name: string;
    search(queries: string[], gl?: Geo): Promise<SearchResult[]>;
}

const LANGSEARCH_DEFAULT_ENDPOINT = 'https://api.langsearch.com/v1/web-search';
const LANGSEARCH_DEFAULT_COUNT = 10;
const LANGSEARCH_DEFAULT_FRESHNESS = 'noLimit';
const LANGSEARCH_TIMEOUT_MS = 15000;

const resolveRuntimeEnv = (key: string): string | undefined => {
    if (typeof process !== 'undefined' && process.env?.[key]) {
        return process.env[key];
    }

    if (typeof self !== 'undefined' && (self as any)[key]) {
        return (self as any)[key];
    }

    if (typeof window !== 'undefined' && (window as any)[key]) {
        return (window as any)[key];
    }

    return undefined;
};

const parseBoolean = (value: unknown, fallback: boolean): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return fallback;

    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 't', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'f', 'no', 'n', 'off'].includes(normalized)) return false;
    return fallback;
};

const parseNumber = (value: unknown, fallback: number): number => {
    const parsed =
        typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : Number.NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
    }
    return fallback;
};

const collectResultCandidates = (source: any, collector: any[], visited = new Set<any>()): void => {
    if (!source || visited.has(source)) return;
    visited.add(source);

    if (Array.isArray(source)) {
        source.forEach(item => collectResultCandidates(item, collector, visited));
        return;
    }

    if (typeof source !== 'object') return;

    if ((source.title || source.name) && (source.url || source.link)) {
        collector.push(source);
    }

    for (const key of Object.keys(source)) {
        if (key === 'title' || key === 'url' || key === 'link') continue;
        collectResultCandidates((source as any)[key], collector, visited);
    }
};

export class LangSearchProvider implements SearchProvider {
    name = 'LangSearch';
    private readonly apiKey: string;
    private readonly endpoint: string;
    private readonly timeoutMs: number;
    private readonly includeSummary: boolean;
    private readonly resultCount: number;
    private readonly freshness: string;

    constructor() {
        this.apiKey = resolveRuntimeEnv('LANGSEARCH_API_KEY')?.trim() || '';
        if (!this.apiKey) {
            throw new Error('LANGSEARCH_API_KEY is not configured');
        }

        this.endpoint = resolveRuntimeEnv('LANGSEARCH_API_URL')?.trim() || LANGSEARCH_DEFAULT_ENDPOINT;
        this.timeoutMs = parseNumber(resolveRuntimeEnv('LANGSEARCH_TIMEOUT_MS'), LANGSEARCH_TIMEOUT_MS);
    this.includeSummary = parseBoolean(resolveRuntimeEnv('LANGSEARCH_ENABLE_SUMMARY'), true);
    this.resultCount = parseNumber(resolveRuntimeEnv('LANGSEARCH_COUNT'), LANGSEARCH_DEFAULT_COUNT);
        this.freshness = resolveRuntimeEnv('LANGSEARCH_FRESHNESS')?.trim() || LANGSEARCH_DEFAULT_FRESHNESS;
    }

    async search(queries: string[], gl?: Geo): Promise<SearchResult[]> {
        const query = queries.map(item => item?.trim()).find(Boolean);
        if (!query) {
            return [];
        }

        const headers = new Headers();
        headers.append('Authorization', `Bearer ${this.apiKey}`);
        headers.append('Content-Type', 'application/json');

        const payload: Record<string, unknown> = {
            query,
            count: this.resultCount,
            freshness: this.freshness,
            summary: this.includeSummary,
        };

        const locationParts = [gl?.city, gl?.country].filter(Boolean);
        if (locationParts.length) {
            payload.location = locationParts.join(', ');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            if (!response.ok) {
                const errorBody = await response.text().catch(() => '');
                throw new Error(
                    `LangSearch API responded with status ${response.status}: ${errorBody || response.statusText}`
                );
            }

            const data = await response.json().catch(() => ({}));
            return this.normalizeResults(data);
        } catch (error) {
            if (controller.signal.aborted) {
                throw new Error('LangSearch request timed out');
            }
            throw error instanceof Error ? error : new Error(String(error));
        } finally {
            clearTimeout(timeoutId);
        }
    }

    private normalizeResults(data: any): SearchResult[] {
        const collector: any[] = [];
        collectResultCandidates(data, collector);

        const seen = new Set<string>();
        return collector
            .map(item => ({
                title: item.title || item.name || 'Untitled result',
                link: item.url || item.link,
                snippet:
                    item.snippet ||
                    item.description ||
                    item.summary ||
                    item.content ||
                    item.text ||
                    '',
            }))
            .filter(result => {
                if (!result.link) return false;
                if (seen.has(result.link)) return false;
                seen.add(result.link);
                return true;
            })
            .slice(0, this.resultCount);
    }
}

export class SerperProvider implements SearchProvider {
    name = 'Serper';
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.SERPER_API_KEY || (self as any).SERPER_API_KEY || '';
        if (!this.apiKey) {
            throw new Error('SERPER_API_KEY is not configured');
        }
    }

    async search(queries: string[], gl?: Geo): Promise<SearchResult[]> {
        const headers = new Headers();
        headers.append('X-API-KEY', this.apiKey);
        headers.append('Content-Type', 'application/json');

        const requestBody = JSON.stringify(
            queries.slice(0, 3).map(query => ({
                q: query,
                gl: gl?.country,
                location: gl?.city,
            }))
        );

        logger.debug('Serper request', { requestBody });

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch('https://google.serper.dev/search', {
                method: 'POST',
                headers,
                body: requestBody,
                redirect: 'follow',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Serper API responded with status: ${response.status}`);
            }

            const batchResult = await response.json();

            const organicResultsLists =
                batchResult?.map((result: any) => result.organic?.slice(0, 10)) || [];
            const allOrganicResults = organicResultsLists.flat();
            const uniqueOrganicResults = allOrganicResults.filter(
                (result: any, index: number, self: any[]) =>
                    index === self.findIndex((r: any) => r?.link === result?.link)
            );

            return uniqueOrganicResults.slice(0, 10).map((item: any) => ({
                title: item.title,
                link: item.link,
                snippet: item.snippet,
            }));
        } catch (error) {
            logger.error('Serper API error', error as Error);
            throw new Error(`Serper failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

export class SearchManager {
    private primaryProvider: SearchProvider | null = null;
    private fallbackProvider: SearchProvider | null = null;
    private readonly fallbackOnFailure: boolean;

    constructor() {
        // Try to initialize LangSearch as primary
        try {
            this.primaryProvider = new LangSearchProvider();
        } catch (error) {
            logger.warn('LangSearch not available', { error });
        }

        // Try to initialize Serper as fallback
        const fallbackFlag = parseBoolean(
            resolveRuntimeEnv('LANGSEARCH_ENABLE_SERPER_FALLBACK'),
            false
        );
        this.fallbackOnFailure = fallbackFlag;

        if (!this.primaryProvider || this.fallbackOnFailure) {
            try {
                this.fallbackProvider = new SerperProvider();
            } catch (error) {
                logger.warn('Serper not available', { error });
            }
        }

        if (!this.primaryProvider && !this.fallbackProvider) {
            throw new Error('No search providers available. Please configure LANGSEARCH_API_KEY or SERPER_API_KEY');
        }
    }

    async search(queries: string[], gl?: Geo): Promise<SearchResult[]> {
        let primaryError: Error | null = null;

        if (this.primaryProvider) {
            try {
                logger.debug(`Using primary provider: ${this.primaryProvider.name}`);
                const results = await this.primaryProvider.search(queries, gl);
                if (results && results.length > 0) {
                    return results;
                }
                primaryError = new Error('LangSearch returned no results');
            } catch (error) {
                primaryError = error instanceof Error ? error : new Error(String(error));
                logger.error(`Primary provider ${this.primaryProvider.name} failed`, primaryError);
            }

            if (!this.fallbackProvider) {
                throw primaryError ?? new Error('LangSearch search failed');
            }

            if (!this.fallbackOnFailure && primaryError) {
                throw primaryError;
            }
        }

        if (this.fallbackProvider) {
            logger.debug(`Using fallback provider: ${this.fallbackProvider.name}`);
            return await this.fallbackProvider.search(queries, gl);
        }

        throw primaryError ?? new Error('All search providers failed');
    }
}

// Export the legacy function for backward compatibility
export const getSERPResults = async (queries: string[], gl?: Geo): Promise<SearchResult[]> => {
    const searchManager = new SearchManager();
    return await searchManager.search(queries, gl);
};