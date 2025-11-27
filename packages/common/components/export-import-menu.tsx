'use client';

import { useState, useRef } from 'react';
import { useChatStore } from '../store/chat.store';
import {
    downloadThreadAsJson,
    downloadThreadAsMarkdown,
    downloadAllThreadsAsJson,
    readFileAsText,
    parseImportedJson,
    validateImportedData,
    convertImportedToThread,
} from '@repo/shared/utils';
import { Button, cn } from '@repo/ui';
import {
    IconDownload,
    IconUpload,
    IconFile,
    IconMarkdown,
    IconArchive,
    IconAlertCircle,
    IconCheck,
} from '@tabler/icons-react';

export interface ExportImportMenuProps {
    className?: string;
}

type ExportFormat = 'json' | 'markdown';

export function ExportImportMenu({ className }: ExportImportMenuProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [importSuccess, setImportSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const threads = useChatStore(state => state.threads);
    const currentThreadId = useChatStore(state => state.currentThreadId);
    const getThreadItems = useChatStore(state => state.getThreadItems);
    const createThread = useChatStore(state => state.createThread);
    const createThreadItem = useChatStore(state => state.createThreadItem);

    const currentThread = threads.find(t => t.id === currentThreadId);

    const handleExportCurrent = async (format: ExportFormat) => {
        if (!currentThread || !currentThreadId) return;

        setIsExporting(true);
        try {
            const items = await getThreadItems(currentThreadId);
            
            if (format === 'json') {
                downloadThreadAsJson(currentThread, items);
            } else {
                downloadThreadAsMarkdown(currentThread, items);
            }
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportAll = async () => {
        setIsExporting(true);
        try {
            const allThreadsWithItems = await Promise.all(
                threads.map(async thread => ({
                    thread,
                    items: await getThreadItems(thread.id),
                }))
            );
            
            downloadAllThreadsAsJson(allThreadsWithItems);
        } catch (error) {
            console.error('Bulk export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportError(null);
        setImportSuccess(false);

        try {
            const content = await readFileAsText(file);
            const parsed = parseImportedJson(content);
            
            const validation = validateImportedData(parsed);
            if (!validation.valid) {
                setImportError(validation.error || 'Invalid file format');
                return;
            }

            // Handle bulk import
            if ('threadCount' in parsed) {
                for (const threadData of parsed.threads) {
                    const { thread: threadTemplate, items: itemTemplates } = convertImportedToThread(threadData);
                    const newThread = await createThread(`imported-${Date.now()}-${Math.random()}`, {
                        title: threadTemplate.title,
                    });
                    
                    for (const itemTemplate of itemTemplates) {
                        await createThreadItem({
                            ...itemTemplate,
                            id: `imported-item-${Date.now()}-${Math.random()}`,
                            threadId: newThread.id,
                        } as any);
                    }
                }
            } else {
                // Single thread import
                const { thread: threadTemplate, items: itemTemplates } = convertImportedToThread(parsed);
                const newThread = await createThread(`imported-${Date.now()}`, {
                    title: threadTemplate.title,
                });
                
                for (const itemTemplate of itemTemplates) {
                    await createThreadItem({
                        ...itemTemplate,
                        id: `imported-item-${Date.now()}-${Math.random()}`,
                        threadId: newThread.id,
                    } as any);
                }
            }

            setImportSuccess(true);
            setTimeout(() => setImportSuccess(false), 3000);
        } catch (error) {
            console.error('Import failed:', error);
            setImportError('Failed to import file. Please check the format.');
        } finally {
            setIsImporting(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className={cn('flex flex-col gap-4', className)}>
            <div>
                <h3 className="text-sm font-medium">Export Conversations</h3>
                <p className="text-xs text-muted-foreground mt-1">
                    Save your conversations to your device
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    variant="bordered"
                    size="sm"
                    onClick={() => handleExportCurrent('json')}
                    disabled={!currentThread || isExporting}
                    className="gap-2"
                >
                    <IconFile size={16} />
                    Export Current (JSON)
                </Button>
                <Button
                    variant="bordered"
                    size="sm"
                    onClick={() => handleExportCurrent('markdown')}
                    disabled={!currentThread || isExporting}
                    className="gap-2"
                >
                    <IconMarkdown size={16} />
                    Export Current (Markdown)
                </Button>
                <Button
                    variant="bordered"
                    size="sm"
                    onClick={handleExportAll}
                    disabled={threads.length === 0 || isExporting}
                    className="gap-2"
                >
                    <IconArchive size={16} />
                    Export All ({threads.length})
                </Button>
            </div>

            <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium">Import Conversations</h3>
                <p className="text-xs text-muted-foreground mt-1">
                    Restore conversations from a backup file
                </p>
            </div>

            <div className="flex flex-col gap-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                />
                <Button
                    variant="bordered"
                    size="sm"
                    onClick={handleImportClick}
                    disabled={isImporting}
                    className="gap-2 self-start"
                >
                    <IconUpload size={16} />
                    {isImporting ? 'Importing...' : 'Import from JSON'}
                </Button>

                {importError && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                        <IconAlertCircle size={16} />
                        {importError}
                    </div>
                )}

                {importSuccess && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <IconCheck size={16} />
                        Conversations imported successfully!
                    </div>
                )}
            </div>
        </div>
    );
}
