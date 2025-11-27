/**
 * Conversation Export/Import Utilities
 * 
 * Provides functionality to export and import chat conversations
 * in various formats (JSON, Markdown)
 */

import { Thread, ThreadItem, Source } from '@repo/shared/types';

export interface ExportedConversation {
    version: string;
    exportedAt: string;
    thread: {
        id: string;
        title: string;
        createdAt: string;
        updatedAt: string;
    };
    messages: ExportedMessage[];
}

export interface ExportedMessage {
    id: string;
    query: string;
    answer?: string;
    mode: string;
    createdAt: string;
    sources?: Source[];
    error?: string;
}

export interface BulkExport {
    version: string;
    exportedAt: string;
    threadCount: number;
    threads: ExportedConversation[];
}

const EXPORT_VERSION = '1.0.0';

/**
 * Export a single thread to JSON format
 */
export function exportThreadToJson(thread: Thread, items: ThreadItem[]): ExportedConversation {
    const sortedItems = [...items].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        thread: {
            id: thread.id,
            title: thread.title,
            createdAt: thread.createdAt.toISOString(),
            updatedAt: thread.updatedAt.toISOString(),
        },
        messages: sortedItems.map(item => ({
            id: item.id,
            query: item.query,
            answer: item.answer?.text || item.answer?.finalText,
            mode: item.mode,
            createdAt: item.createdAt.toISOString(),
            sources: item.sources,
            error: item.error,
        })),
    };
}

/**
 * Export a single thread to Markdown format
 */
export function exportThreadToMarkdown(thread: Thread, items: ThreadItem[]): string {
    const sortedItems = [...items].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const lines: string[] = [];
    
    // Header
    lines.push(`# ${thread.title}`);
    lines.push('');
    lines.push(`*Exported on ${new Date().toLocaleString()}*`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Messages
    for (const item of sortedItems) {
        // User message
        lines.push('## 👤 User');
        lines.push('');
        lines.push(item.query);
        lines.push('');

        // Assistant response
        if (item.answer?.text || item.answer?.finalText) {
            lines.push('## 🤖 Assistant');
            lines.push('');
            lines.push(item.answer.text || item.answer.finalText || '');
            lines.push('');
        }

        // Sources
        if (item.sources && item.sources.length > 0) {
            lines.push('### Sources');
            lines.push('');
            for (const source of item.sources) {
                lines.push(`- [${source.title}](${source.link})`);
            }
            lines.push('');
        }

        // Error
        if (item.error) {
            lines.push('> ⚠️ Error: ' + item.error);
            lines.push('');
        }

        lines.push('---');
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Export multiple threads (bulk export)
 */
export function exportThreadsBulk(
    threads: Array<{ thread: Thread; items: ThreadItem[] }>
): BulkExport {
    return {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        threadCount: threads.length,
        threads: threads.map(({ thread, items }) => exportThreadToJson(thread, items)),
    };
}

/**
 * Download data as a file
 */
export function downloadFile(data: string, filename: string, mimeType: string): void {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

/**
 * Export thread and trigger download
 */
export function downloadThreadAsJson(thread: Thread, items: ThreadItem[]): void {
    const exported = exportThreadToJson(thread, items);
    const json = JSON.stringify(exported, null, 2);
    const filename = `${sanitizeFilename(thread.title)}_${formatDate(new Date())}.json`;
    downloadFile(json, filename, 'application/json');
}

/**
 * Export thread as Markdown and trigger download
 */
export function downloadThreadAsMarkdown(thread: Thread, items: ThreadItem[]): void {
    const markdown = exportThreadToMarkdown(thread, items);
    const filename = `${sanitizeFilename(thread.title)}_${formatDate(new Date())}.md`;
    downloadFile(markdown, filename, 'text/markdown');
}

/**
 * Export all threads and trigger download
 */
export function downloadAllThreadsAsJson(
    threads: Array<{ thread: Thread; items: ThreadItem[] }>
): void {
    const exported = exportThreadsBulk(threads);
    const json = JSON.stringify(exported, null, 2);
    const filename = `llmchat_export_${formatDate(new Date())}.json`;
    downloadFile(json, filename, 'application/json');
}

/**
 * Parse imported JSON conversation
 */
export function parseImportedJson(jsonString: string): ExportedConversation | BulkExport {
    const data = JSON.parse(jsonString);
    
    // Check if it's a bulk export or single conversation
    if ('threadCount' in data && 'threads' in data) {
        return data as BulkExport;
    }
    
    return data as ExportedConversation;
}

/**
 * Convert imported conversation back to Thread and ThreadItems
 */
export function convertImportedToThread(
    imported: ExportedConversation
): { thread: Omit<Thread, 'id'>; items: Omit<ThreadItem, 'id' | 'threadId'>[] } {
    return {
        thread: {
            title: imported.thread.title,
            createdAt: new Date(imported.thread.createdAt),
            updatedAt: new Date(imported.thread.updatedAt),
            pinned: false,
            pinnedAt: new Date(),
        },
        items: imported.messages.map(msg => ({
            query: msg.query,
            answer: msg.answer ? { text: msg.answer } : undefined,
            mode: msg.mode as any,
            createdAt: new Date(msg.createdAt),
            updatedAt: new Date(msg.createdAt),
            sources: msg.sources,
            error: msg.error,
            status: 'COMPLETED' as const,
        })),
    };
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Sanitize filename for safe file system usage
 */
function sanitizeFilename(name: string): string {
    return name
        .replace(/[^a-z0-9\s-]/gi, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
}

/**
 * Format date for filename
 */
function formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

/**
 * Validate imported data structure
 */
export function validateImportedData(data: unknown): { valid: boolean; error?: string } {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Invalid data format' };
    }

    const obj = data as Record<string, unknown>;

    // Check for version
    if (!obj.version) {
        return { valid: false, error: 'Missing version field' };
    }

    // Check for bulk export
    if ('threadCount' in obj && 'threads' in obj) {
        if (!Array.isArray(obj.threads)) {
            return { valid: false, error: 'Invalid threads array' };
        }
        return { valid: true };
    }

    // Check for single conversation
    if (!obj.thread || !obj.messages) {
        return { valid: false, error: 'Missing thread or messages' };
    }

    if (!Array.isArray(obj.messages)) {
        return { valid: false, error: 'Invalid messages array' };
    }

    return { valid: true };
}
