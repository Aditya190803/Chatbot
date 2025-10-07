import { Thread, ThreadItem } from './types';

type DateLike = Date | string | number | null | undefined;

const toISOString = (value: DateLike): string => {
    if (!value) return new Date().toISOString();
    if (value instanceof Date) return value.toISOString();
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return new Date().toISOString();
    }
    return date.toISOString();
};

const toOptionalISOString = (value: DateLike): string | null => {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
};

const fromISOString = (value: string | null | undefined): Date => {
    if (!value) return new Date();
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return new Date();
    }
    return date;
};

export type SerializedThread = Omit<Thread, 'createdAt' | 'updatedAt' | 'pinnedAt' | 'autoTitleUpdatedAt'> & {
    createdAt: string;
    updatedAt: string;
    pinnedAt: string | null;
    autoTitleUpdatedAt?: string | null;
};

export type SerializedThreadItem = Omit<ThreadItem, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
};

export const serializeThread = (thread: Thread): SerializedThread => {
    const {
        createdAt,
        updatedAt,
        pinnedAt,
        autoTitleUpdatedAt,
        ...rest
    } = thread;

    return {
        ...rest,
        createdAt: toISOString(createdAt),
        updatedAt: toISOString(updatedAt),
        pinnedAt: toOptionalISOString(pinnedAt),
        autoTitleUpdatedAt: autoTitleUpdatedAt ? toOptionalISOString(autoTitleUpdatedAt) : null,
    };
};

export const deserializeThread = (thread: SerializedThread): Thread => {
    const {
        createdAt,
        updatedAt,
        pinnedAt,
        autoTitleUpdatedAt,
        ...rest
    } = thread;

    return {
        ...rest,
        createdAt: fromISOString(createdAt),
        updatedAt: fromISOString(updatedAt),
        pinned: Boolean(rest.pinned),
        pinnedAt: pinnedAt ? fromISOString(pinnedAt) : new Date(fromISOString(createdAt).getTime()),
        autoTitleUpdatedAt: autoTitleUpdatedAt ? fromISOString(autoTitleUpdatedAt) : undefined,
    };
};

export const serializeThreadItem = (threadItem: ThreadItem): SerializedThreadItem => {
    const { createdAt, updatedAt, ...rest } = threadItem as ThreadItem & {
        persistToDB?: never;
    };

    return {
        ...rest,
        createdAt: toISOString(createdAt),
        updatedAt: toISOString(updatedAt),
    };
};

export const deserializeThreadItem = (threadItem: SerializedThreadItem): ThreadItem => {
    const { createdAt, updatedAt, ...rest } = threadItem;
    return {
        ...rest,
        createdAt: fromISOString(createdAt),
        updatedAt: fromISOString(updatedAt),
    } as ThreadItem;
};

export type ThreadPayload = {
    thread: SerializedThread;
    items: SerializedThreadItem[];
};
