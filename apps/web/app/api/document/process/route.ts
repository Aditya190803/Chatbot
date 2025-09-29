import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pdf from 'pdf-parse';
import { documentStore } from '@repo/ai/document-store';

const processDocumentSchema = z.object({
    documentId: z.string(),
});

// Supported file types
const SUPPORTED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
];

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        const userId = session?.userId;
        
        const formData = await request.formData();
        const file = formData.get('document') as File;
        const documentId = formData.get('documentId') as string;

        if (!file) {
            return NextResponse.json(
                { error: 'No document file provided' },
                { status: 400 }
            );
        }

        const validation = processDocumentSchema.safeParse({ documentId });
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid document ID' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: 'Unsupported file type. Please upload PDF, DOCX, TXT, or MD files.' },
                { status: 400 }
            );
        }

        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 10MB.' },
                { status: 400 }
            );
        }

        let extractedText = '';

        // Extract text based on file type
        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        switch (file.type) {
            case 'application/pdf':
                try {
                    const pdfData = await pdf(uint8Array);
                    extractedText = pdfData.text;
                } catch (error) {
                    console.error('PDF parsing error:', error);
                    return NextResponse.json(
                        { error: 'Failed to parse PDF file' },
                        { status: 400 }
                    );
                }
                break;

            case 'text/plain':
            case 'text/markdown':
                extractedText = Buffer.from(uint8Array).toString('utf-8');
                break;

            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                // For now, return an error for DOCX files
                // In a production environment, you'd use a library like 'mammoth' to extract text
                return NextResponse.json(
                    { error: 'DOCX support coming soon. Please convert to PDF or TXT format.' },
                    { status: 400 }
                );

            default:
                return NextResponse.json(
                    { error: 'Unsupported file type' },
                    { status: 400 }
                );
        }

        // Validate extracted text
        if (!extractedText || extractedText.trim().length === 0) {
            return NextResponse.json(
                { error: 'No text content found in the document' },
                { status: 400 }
            );
        }

        // Clean up the text
        const cleanedText = extractedText
            .replace(/\s+/g, ' ')
            .trim();

        if (cleanedText.length < 50) {
            return NextResponse.json(
                { error: 'Document content is too short (minimum 50 characters)' },
                { status: 400 }
            );
        }

        // Store document in document store
        const processedDocument = await documentStore.addDocument(
            documentId,
            file.name,
            file.type,
            file.size,
            cleanedText,
            userId
        );
        
        const response = {
            documentId: processedDocument.id,
            filename: processedDocument.filename,
            fileType: processedDocument.fileType,
            size: processedDocument.size,
            textLength: cleanedText.length,
            chunkCount: processedDocument.chunks.length,
            status: 'processed',
            extractedText: cleanedText.substring(0, 200) + '...', // Preview
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Document processing error:', error);
        return NextResponse.json(
            { error: 'Internal server error during document processing' },
            { status: 500 }
        );
    }
}