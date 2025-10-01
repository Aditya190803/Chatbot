import { describe, expect, test } from 'vitest';
import { ChatMode } from '@repo/shared/config';
import { ThreadItem } from '@repo/shared/types';
import {
    buildBranchGroups,
    buildConversationView,
    ensureBranchRootId,
    resolveBranchRootId,
} from '../branching-utils';

const createThreadItem = (overrides: Partial<ThreadItem> = {}): ThreadItem => {
    const now = new Date();
    return {
        id: overrides.id ?? 'item-' + Math.random().toString(36).slice(2, 10),
        threadId: overrides.threadId ?? 'thread-1',
        query: overrides.query ?? 'Hello world',
        answer: overrides.answer,
        status: overrides.status,
        createdAt: overrides.createdAt ?? now,
        updatedAt: overrides.updatedAt ?? now,
        mode: overrides.mode ?? ChatMode.GEMINI_2_5_FLASH,
        parentId: overrides.parentId,
        branchRootId: overrides.branchRootId,
        metadata: overrides.metadata,
        suggestions: overrides.suggestions,
        steps: overrides.steps,
        toolCalls: overrides.toolCalls,
        toolResults: overrides.toolResults,
        tokensUsed: overrides.tokensUsed,
        generationDurationMs: overrides.generationDurationMs,
        object: overrides.object,
        sources: overrides.sources,
        imageAttachment: overrides.imageAttachment,
    };
};

describe('branching utils', () => {
    test('resolveBranchRootId returns explicit branchRootId', () => {
        const item = createThreadItem({ branchRootId: 'root-123' });
        expect(resolveBranchRootId(item)).toBe('root-123');
    });

    test('resolveBranchRootId falls back to fallbackId and id', () => {
        const item = createThreadItem({ id: 'item-123', branchRootId: '' });
        expect(resolveBranchRootId(item, 'fallback')).toBe('fallback');
        expect(resolveBranchRootId({ ...item, branchRootId: undefined }, undefined)).toBe(
            'item-123'
        );
    });

    test('resolveBranchRootId reads metadata branch root', () => {
        const item = createThreadItem({ metadata: { branchRootId: 'meta-root' } });
        expect(resolveBranchRootId(item)).toBe('meta-root');
    });

    test('ensureBranchRootId returns new object with branchRootId applied', () => {
        const item = createThreadItem({ branchRootId: undefined });
        const normalized = ensureBranchRootId(item, 'root-xyz');
        expect(normalized.branchRootId).toBe('root-xyz');
        expect(normalized).not.toBe(item);
    });

    test('buildBranchGroups groups siblings by branch root and sorts chronologically', () => {
        const baseCreatedAt = new Date('2024-01-01T00:00:00Z');
        const items = [
            createThreadItem({ id: 'a', createdAt: baseCreatedAt }),
            createThreadItem({ id: 'b', createdAt: new Date('2024-01-02T00:00:00Z'), branchRootId: 'a' }),
            createThreadItem({ id: 'c', createdAt: new Date('2024-01-03T00:00:00Z'), branchRootId: 'a' }),
            createThreadItem({ id: 'd', createdAt: new Date('2024-01-04T00:00:00Z'), branchRootId: 'd' }),
        ];

        const groups = buildBranchGroups(items);
        expect(groups.size).toBe(2);

        const rootA = groups.get('a');
        expect(rootA).toBeDefined();
        expect(rootA?.map(item => item.id)).toEqual(['a', 'b', 'c']);

        const rootD = groups.get('d');
        expect(rootD).toBeDefined();
        expect(rootD?.map(item => item.id)).toEqual(['d']);
    });

    test('buildConversationView returns newest branch by default', () => {
        const base = new Date('2024-01-01T00:00:00Z');
        const items = [
            createThreadItem({ id: 'root', branchRootId: 'root', createdAt: base }),
            createThreadItem({
                id: 'branch-1',
                branchRootId: 'root',
                createdAt: new Date('2024-01-01T00:01:00Z'),
            }),
            createThreadItem({
                id: 'branch-2',
                branchRootId: 'root',
                createdAt: new Date('2024-01-01T00:02:00Z'),
            }),
            createThreadItem({ id: 'other', branchRootId: 'other', createdAt: new Date('2024-01-02T00:00:00Z') }),
        ];

        const conversation = buildConversationView(items, {});
        expect(conversation.map(item => item.id)).toEqual(['branch-2', 'other']);
    });

    test('buildConversationView respects selected branches when available', () => {
        const items = [
            createThreadItem({ id: 'root', branchRootId: 'root', createdAt: new Date('2024-01-01T00:00:00Z') }),
            createThreadItem({
                id: 'branch-1',
                branchRootId: 'root',
                createdAt: new Date('2024-01-01T00:01:00Z'),
            }),
            createThreadItem({
                id: 'branch-2',
                branchRootId: 'root',
                createdAt: new Date('2024-01-01T00:02:00Z'),
            }),
            createThreadItem({ id: 'second-root', branchRootId: 'second-root', createdAt: new Date('2024-01-02T00:00:00Z') }),
        ];

        const conversation = buildConversationView(items, { root: 'branch-1' });
        expect(conversation.map(item => item.id)).toEqual(['branch-1', 'second-root']);
    });

    test('buildConversationView falls back when selection is missing', () => {
        const items = [
            createThreadItem({ id: 'root', branchRootId: 'root', createdAt: new Date('2024-01-01T00:00:00Z') }),
            createThreadItem({
                id: 'branch-1',
                branchRootId: 'root',
                createdAt: new Date('2024-01-01T00:01:00Z'),
            }),
        ];

        const conversation = buildConversationView(items, { root: 'does-not-exist' });
        expect(conversation.map(item => item.id)).toEqual(['branch-1']);
    });
});
