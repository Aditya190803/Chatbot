'use client';

import { useChatStore } from '../store';
import { cn } from '@repo/ui';
import { IconCloud, IconCloudOff, IconCloudUpload, IconAlertCircle } from '@tabler/icons-react';

type SyncStatusProps = {
    className?: string;
    showLabel?: boolean;
};

type ChatStoreState = {
    syncMode: 'local' | 'appwrite';
    isSyncingRemote: boolean;
    lastRemoteSyncError: string | null;
};

export const SyncStatus = ({ className, showLabel = true }: SyncStatusProps) => {
    const syncMode = useChatStore((state: ChatStoreState) => state.syncMode);
    const isSyncingRemote = useChatStore((state: ChatStoreState) => state.isSyncingRemote);
    const lastRemoteSyncError = useChatStore((state: ChatStoreState) => state.lastRemoteSyncError);

    const isLocal = syncMode === 'local';
    const isSyncing = isSyncingRemote;
    const hasError = !!lastRemoteSyncError;

    const getStatusInfo = () => {
        if (isLocal) {
            return {
                icon: IconCloudOff,
                label: 'Local only',
                description: 'Data stored on this device',
                className: 'text-muted-foreground',
            };
        }

        if (hasError) {
            return {
                icon: IconAlertCircle,
                label: 'Sync error',
                description: lastRemoteSyncError || 'Failed to sync',
                className: 'text-destructive',
            };
        }

        if (isSyncing) {
            return {
                icon: IconCloudUpload,
                label: 'Syncing...',
                description: 'Uploading to cloud',
                className: 'text-blue-500 animate-pulse',
            };
        }

        return {
            icon: IconCloud,
            label: 'Synced',
            description: 'Data backed up to cloud',
            className: 'text-green-500',
        };
    };

    const status = getStatusInfo();
    const Icon = status.icon;

    return (
        <div
            className={cn(
                'flex items-center gap-2',
                className
            )}
            title={status.description}
        >
            <Icon size={14} strokeWidth={2} className={status.className} />
            {showLabel && (
                <span className={cn('text-xs', status.className)}>
                    {status.label}
                </span>
            )}
        </div>
    );
};
