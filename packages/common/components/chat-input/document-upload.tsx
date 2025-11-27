'use client';
import { useChatStore } from '@repo/common/store';
import { logger } from '@repo/shared/logger';
import { Button, cn, Tooltip } from '@repo/ui';
import { IconFile, IconFileCheck, IconFileX, IconLoader, IconUpload } from '@tabler/icons-react';
import { FC, useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

export interface DocumentUpload {
    file: File;
    status: 'uploading' | 'processing' | 'ready' | 'error';
    id: string;
    error?: string;
}

interface DocumentUploadProps {
    onDocumentUpload?: (document: DocumentUpload) => void;
    onDocumentRemove?: (documentId: string) => void;
    documents?: DocumentUpload[];
    className?: string;
}

const ACCEPTED_FILE_TYPES = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'text/plain': ['.txt'],
    'text/markdown': ['.md'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const DocumentUpload: FC<DocumentUploadProps> = ({
    onDocumentUpload,
    onDocumentRemove,
    documents = [],
    className,
}) => {
    const [isDragActive, setIsDragActive] = useState(false);

    const processFile = async (file: File): Promise<void> => {
        const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const document: DocumentUpload = {
            file,
            status: 'uploading',
            id: documentId,
        };

        onDocumentUpload?.(document);

        try {
            // Simulate upload delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Update status to processing
            onDocumentUpload?.({
                ...document,
                status: 'processing',
            });

            // Call document processing API
            const formData = new FormData();
            formData.append('document', file);
            formData.append('documentId', documentId);

            const response = await fetch('/api/document/process', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                let errorMessage = response.statusText || 'Upload failed';
                try {
                    const errorBody = await response.json();
                    if (typeof errorBody?.error === 'string') {
                        errorMessage = errorBody.error;
                    }
                } catch (jsonError) {
                    try {
                        const text = await response.text();
                        if (text) {
                            errorMessage = text;
                        }
                    } catch {
                        // ignore parsing errors
                    }
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();

            // Update status to ready
            onDocumentUpload?.({
                ...document,
                status: 'ready',
            });

        } catch (error) {
            logger.error('Document processing error', error);
            onDocumentUpload?.({
                ...document,
                status: 'error',
                error: error instanceof Error ? error.message : 'Upload failed',
            });
        }
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        for (const file of acceptedFiles) {
            await processFile(file);
        }
    }, [onDocumentUpload]);

    const { getRootProps, getInputProps, isDragActive: dropzoneActive } = useDropzone({
        onDrop,
        accept: ACCEPTED_FILE_TYPES,
        maxSize: MAX_FILE_SIZE,
        multiple: true,
        onDragEnter: () => setIsDragActive(true),
        onDragLeave: () => setIsDragActive(false),
        onDropAccepted: () => setIsDragActive(false),
        onDropRejected: () => setIsDragActive(false),
    });

    const getStatusIcon = (status: DocumentUpload['status']) => {
        switch (status) {
            case 'uploading':
            case 'processing':
                return <IconLoader size={16} className="animate-spin" />;
            case 'ready':
                return <IconFileCheck size={16} className="text-green-500" />;
            case 'error':
                return <IconFileX size={16} className="text-red-500" />;
            default:
                return <IconFile size={16} />;
        }
    };

    const getStatusText = (status: DocumentUpload['status']) => {
        switch (status) {
            case 'uploading':
                return 'Uploading...';
            case 'processing':
                return 'Processing...';
            case 'ready':
                return 'Ready for Q&A';
            case 'error':
                return 'Upload failed';
            default:
                return '';
        }
    };

    return (
        <div className={cn('space-y-3', className)}>
            {/* Upload Area */}
            <div
                {...getRootProps()}
                className={cn(
                    'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
                    isDragActive || dropzoneActive
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                )}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-2">
                    <IconUpload 
                        size={32} 
                        className={cn(
                            'text-muted-foreground',
                            (isDragActive || dropzoneActive) && 'text-primary'
                        )} 
                    />
                    <div className="text-sm">
                        <span className="font-medium">Click to upload</span> or drag and drop
                    </div>
                    <div className="text-xs text-muted-foreground">
                        PDF, DOCX, PPTX, XLSX, TXT, MD files up to 10MB
                    </div>
                </div>
            </div>

            {/* Document List */}
            {documents.length > 0 && (
                <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                        Uploaded Documents ({documents.length})
                    </div>
                    {documents.map((doc) => (
                        <div
                            key={doc.id}
                            className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                        >
                            {getStatusIcon(doc.status)}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                    {doc.file.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {getStatusText(doc.status)}
                                    {doc.error && ` - ${doc.error}`}
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onDocumentRemove?.(doc.id)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Remove
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};