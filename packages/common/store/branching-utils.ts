import { ThreadItem } from '@repo/shared/types';

export const resolveBranchRootId = (item: ThreadItem, fallbackId?: string): string => {
    if (typeof item.branchRootId === 'string' && item.branchRootId.length > 0) {
        return item.branchRootId;
    }

    const metadataRoot =
        item.metadata && typeof item.metadata.branchRootId === 'string'
            ? (item.metadata.branchRootId as string)
            : undefined;

    if (metadataRoot && metadataRoot.length > 0) {
        return metadataRoot;
    }

    if (fallbackId && fallbackId.length > 0) {
        return fallbackId;
    }

    return item.id;
};

export const ensureBranchRootId = <T extends ThreadItem>(item: T, fallbackId?: string): T => {
    const branchRootId = resolveBranchRootId(item, fallbackId);
    if (item.branchRootId === branchRootId) {
        return item;
    }

    return {
        ...item,
        branchRootId,
    } as T;
};

export const buildBranchGroups = (items: ThreadItem[]): Map<string, ThreadItem[]> => {
    const groups = new Map<string, ThreadItem[]>();

    for (const item of items) {
        const rootId = resolveBranchRootId(item);
        if (groups.has(rootId)) {
            groups.get(rootId)!.push(item);
        } else {
            groups.set(rootId, [item]);
        }
    }

    groups.forEach((group, key) => {
        groups.set(
            key,
            group.slice().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        );
    });

    return groups;
};

export const buildConversationView = (
    items: ThreadItem[],
    branchSelections: Record<string, string>
): ThreadItem[] => {
    if (!items.length) {
        return [];
    }

    const normalizedItems = items.map(item => ensureBranchRootId(item));
    const groups = buildBranchGroups(normalizedItems);

    const orderedGroups = Array.from(groups.entries())
        .map(([rootId, group]) => ({
            rootId,
            group,
            sortKey: group[0]?.createdAt?.getTime?.() ?? 0,
        }))
        .sort((a, b) => a.sortKey - b.sortKey);

    const conversation: ThreadItem[] = [];

    for (const { rootId, group } of orderedGroups) {
        if (!group.length) {
            continue;
        }

        const selection = branchSelections[rootId];
        const selectedItem = selection ? group.find(item => item.id === selection) : undefined;

        conversation.push(selectedItem ?? group[group.length - 1]);
    }

    return conversation;
};
