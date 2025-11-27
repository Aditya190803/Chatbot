import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Dexie before importing the store
vi.mock('dexie', () => {
    const mockTable = {
        toArray: vi.fn().mockResolvedValue([]),
        get: vi.fn().mockResolvedValue(null),
        add: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue(undefined),
        bulkPut: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
        where: vi.fn().mockReturnValue({
            equals: vi.fn().mockReturnValue({
                toArray: vi.fn().mockResolvedValue([]),
                count: vi.fn().mockResolvedValue(0),
                delete: vi.fn().mockResolvedValue(undefined),
            }),
            above: vi.fn().mockReturnValue({
                and: vi.fn().mockReturnValue({
                    toArray: vi.fn().mockResolvedValue([]),
                }),
            }),
        }),
        update: vi.fn().mockResolvedValue(undefined),
    };

    return {
        default: class MockDexie {
            threads = mockTable;
            threadItems = mockTable;
            version() {
                return {
                    stores: vi.fn().mockReturnThis(),
                };
            }
            transaction() {
                return Promise.resolve();
            }
        },
    };
});

// Mock localStorage
interface LocalStorageMock {
    store: Record<string, string>;
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
    clear: () => void;
}

const localStorageMock: LocalStorageMock = {
    store: {} as Record<string, string>,
    getItem: vi.fn(function(this: LocalStorageMock, key: string): string | null {
        return localStorageMock.store[key] || null;
    }),
    setItem: vi.fn((key: string, value: string) => {
        localStorageMock.store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
        delete localStorageMock.store[key];
    }),
    clear: vi.fn(() => {
        localStorageMock.store = {};
    }),
};

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock SharedWorker
vi.stubGlobal('SharedWorker', class {
    port = {
        start: vi.fn(),
        postMessage: vi.fn(),
        onmessage: null as any,
    };
    onerror: any = null;
});

// Import after mocks are set up
import { ChatMode } from '@repo/shared/config';

describe('Chat Store', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Thread Management', () => {
        it('should create initial state correctly', async () => {
            // Dynamic import to ensure mocks are applied
            const { useChatStore } = await import('./chat.store');
            const state = useChatStore.getState();

            expect(state.threads).toBeDefined();
            expect(state.threadItems).toBeDefined();
            expect(state.isGenerating).toBe(false);
        });

        it('should set model correctly', async () => {
            const { useChatStore } = await import('./chat.store');
            const newModel = { id: 'test-model', name: 'Test Model', provider: 'test' as const };

            await useChatStore.getState().setModel(newModel as any);

            expect(useChatStore.getState().model.id).toBe('test-model');
        });

        it('should set custom instructions', async () => {
            const { useChatStore } = await import('./chat.store');
            const instructions = 'Be helpful and concise';

            useChatStore.getState().setCustomInstructions(instructions);

            expect(useChatStore.getState().customInstructions).toBe(instructions);
        });

        it('should toggle web search', async () => {
            const { useChatStore } = await import('./chat.store');

            useChatStore.getState().setUseWebSearch(true);
            expect(useChatStore.getState().useWebSearch).toBe(true);

            useChatStore.getState().setUseWebSearch(false);
            expect(useChatStore.getState().useWebSearch).toBe(false);
        });

        it('should toggle suggestions', async () => {
            const { useChatStore } = await import('./chat.store');

            useChatStore.getState().setShowSuggestions(false);
            expect(useChatStore.getState().showSuggestions).toBe(false);

            useChatStore.getState().setShowSuggestions(true);
            expect(useChatStore.getState().showSuggestions).toBe(true);
        });

        it('should set chat mode', async () => {
            const { useChatStore } = await import('./chat.store');

            useChatStore.getState().setChatMode(ChatMode.Pro);
            expect(useChatStore.getState().chatMode).toBe(ChatMode.Pro);

            useChatStore.getState().setChatMode(ChatMode.Deep);
            expect(useChatStore.getState().chatMode).toBe(ChatMode.Deep);
        });

        it('should set generation state', async () => {
            const { useChatStore } = await import('./chat.store');

            useChatStore.getState().setIsGenerating(true);
            expect(useChatStore.getState().isGenerating).toBe(true);

            useChatStore.getState().setIsGenerating(false);
            expect(useChatStore.getState().isGenerating).toBe(false);
        });

        it('should set image attachment', async () => {
            const { useChatStore } = await import('./chat.store');
            const attachment = { base64: 'data:image/png;base64,abc123' };

            useChatStore.getState().setImageAttachment(attachment);
            expect(useChatStore.getState().imageAttachment.base64).toBe(attachment.base64);

            useChatStore.getState().clearImageAttachment();
            expect(useChatStore.getState().imageAttachment.base64).toBeUndefined();
        });

        it('should set context', async () => {
            const { useChatStore } = await import('./chat.store');
            const context = 'Some context for the conversation';

            useChatStore.getState().setContext(context);
            expect(useChatStore.getState().context).toBe(context);
        });

        it('should set current sources', async () => {
            const { useChatStore } = await import('./chat.store');
            const sources = ['https://example.com', 'https://test.com'];

            useChatStore.getState().setCurrentSources(sources);
            expect(useChatStore.getState().currentSources).toEqual(sources);
        });
    });

    describe('Abort Controller', () => {
        it('should set abort controller', async () => {
            const { useChatStore } = await import('./chat.store');
            const controller = new AbortController();

            useChatStore.getState().setAbortController(controller);
            expect(useChatStore.getState().abortController).toBe(controller);
        });

        it('should stop generation and abort', async () => {
            const { useChatStore } = await import('./chat.store');
            const controller = new AbortController();
            const abortSpy = vi.spyOn(controller, 'abort');

            useChatStore.getState().setAbortController(controller);
            useChatStore.getState().setIsGenerating(true);
            useChatStore.getState().stopGeneration();

            expect(useChatStore.getState().isGenerating).toBe(false);
            expect(abortSpy).toHaveBeenCalled();
        });
    });

    describe('Temporary Threads', () => {
        it('should track temporary thread state', async () => {
            const { useChatStore } = await import('./chat.store');

            // Initially no temporary thread
            expect(useChatStore.getState().temporaryThreadId).toBeNull();
        });
    });

    describe('Thread Item Helpers', () => {
        it('should return empty array for getPreviousThreadItems when no items', async () => {
            const { useChatStore } = await import('./chat.store');

            const items = useChatStore.getState().getPreviousThreadItems();
            expect(items).toEqual([]);
        });

        it('should return null for getCurrentThreadItem when no items', async () => {
            const { useChatStore } = await import('./chat.store');

            const item = useChatStore.getState().getCurrentThreadItem();
            expect(item).toBeNull();
        });

        it('should return null for getCurrentThread when no thread selected', async () => {
            const { useChatStore } = await import('./chat.store');

            useChatStore.setState({ currentThreadId: null, threads: [] });
            const thread = useChatStore.getState().getCurrentThread();
            expect(thread).toBeNull();
        });
    });
});
