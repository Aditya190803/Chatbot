'use client';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@repo/ui';
import { IconFile, IconTrash, IconUpload } from '@tabler/icons-react';
import { useState } from 'react';
import { DocumentUpload } from './chat-input/document-upload';
import { useDocuments } from '../hooks/use-documents';

export function DocumentManager() {
    const [isOpen, setIsOpen] = useState(false);
    const {
        documents,
        handleDocumentUpload,
        handleDocumentRemove,
        uploadedDocuments,
        removeUploadedDocument,
        totalDocuments,
    } = useDocuments();

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <IconFile size={16} />
                    Documents ({totalDocuments})
                </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <IconFile size={20} />
                        Document Manager
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-6">
                    {/* Upload Section */}
                    <div>
                        <h3 className="text-sm font-medium mb-3">Upload New Documents</h3>
                        <DocumentUpload
                            documents={documents}
                            onDocumentUpload={handleDocumentUpload}
                            onDocumentRemove={handleDocumentRemove}
                        />
                    </div>

                    {/* Uploaded Documents */}
                    <div>
                        <h3 className="text-sm font-medium mb-3">
                            Your Documents ({uploadedDocuments.length})
                        </h3>
                        
                        {uploadedDocuments.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <IconUpload size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No documents uploaded yet</p>
                                <p className="text-sm">Upload documents to enable Q&A capabilities</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {uploadedDocuments.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                                    >
                                        <IconFile size={20} className="text-blue-500 mt-0.5" />
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">
                                                {doc.filename}
                                            </div>
                                            <div className="text-xs text-muted-foreground space-y-1">
                                                <div>
                                                    {formatFileSize(doc.size)} • {doc.chunkCount} chunks
                                                </div>
                                                <div>
                                                    Uploaded {formatDate(doc.uploadedAt)}
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removeUploadedDocument(doc.id)}
                                            className="text-muted-foreground hover:text-destructive"
                                        >
                                            <IconTrash size={14} />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Instructions */}
                    {uploadedDocuments.length > 0 && (
                        <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg">
                            <p className="font-medium mb-1">💡 How to use your documents:</p>
                            <ul className="space-y-1 list-disc list-inside">
                                <li>Ask questions about your documents in the chat</li>
                                <li>The AI will search your documents and provide answers</li>
                                <li>Sources will be shown with each response</li>
                            </ul>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}