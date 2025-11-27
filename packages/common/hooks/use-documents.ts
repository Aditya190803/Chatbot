import { useCallback, useEffect, useState } from 'react';
import { logger } from '@repo/shared/logger';
import { DocumentUpload } from '../components/chat-input/document-upload';

export interface DocumentInfo {
    id: string;
    filename: string;
    fileType: string;
    size: number;
    chunkCount: number;
    uploadedAt: string;
}

export interface DocumentQueryResult {
    response: string;
    sources: Array<{
        documentId: string;
        filename: string;
        content: string;
        chunkIndex: number;
    }>;
    documentsCount: number;
    totalChunks: number;
}

export const useDocuments = () => {
    const [documents, setDocuments] = useState<DocumentUpload[]>([]);
    const [uploadedDocuments, setUploadedDocuments] = useState<DocumentInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch user's documents on mount
    const fetchDocuments = useCallback(async () => {
        try {
            const response = await fetch('/api/document/query');
            if (response.ok) {
                const data = await response.json();
                setUploadedDocuments(data.documents || []);
            }
        } catch (error) {
            logger.error('Error fetching documents', error);
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleDocumentUpload = useCallback((document: DocumentUpload) => {
        setDocuments(prev => {
            const existing = prev.find(d => d.id === document.id);
            if (existing) {
                return prev.map(d => d.id === document.id ? document : d);
            }
            return [...prev, document];
        });

        // If document is ready, refetch the documents list
        if (document.status === 'ready') {
            fetchDocuments();
        }
    }, [fetchDocuments]);

    const handleDocumentRemove = useCallback((documentId: string) => {
        setDocuments(prev => prev.filter(d => d.id !== documentId));
    }, []);

    const queryDocuments = useCallback(async (
        query: string,
        model?: string
    ): Promise<DocumentQueryResult | null> => {
        if (!query.trim()) return null;

        setIsLoading(true);
        try {
            const response = await fetch('/api/document/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: query.trim(),
                    model,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to query documents');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            logger.error('Error querying documents', error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const removeUploadedDocument = useCallback(async (documentId: string) => {
        // TODO: Implement document deletion API
        // For now, just remove from local state
        setUploadedDocuments(prev => prev.filter(d => d.id !== documentId));
    }, []);

    return {
        // Document upload state
        documents,
        handleDocumentUpload,
        handleDocumentRemove,
        
        // Uploaded documents
        uploadedDocuments,
        fetchDocuments,
        removeUploadedDocument,
        
        // Document querying
        queryDocuments,
        isLoading,
        
        // Computed values
        hasDocuments: uploadedDocuments.length > 0,
        totalDocuments: uploadedDocuments.length,
    };
};