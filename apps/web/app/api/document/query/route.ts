import { auth } from '@repo/common/auth/server';
import { documentStore } from '@repo/ai/document-store';
import { ModelEnum } from '@repo/ai/models';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@repo/shared/logger';

const apiLogger = logger.child({ module: 'api/document/query' });

const documentQuerySchema = z.object({
    query: z.string().min(1, 'Query cannot be empty'),
    model: z.nativeEnum(ModelEnum).optional(),
});

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        const userId = session?.userId ?? undefined;

        if (!userId) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        
        const body = await request.json();
        const validation = documentQuerySchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { 
                    error: 'Invalid query data',
                    details: validation.error.format() 
                },
                { status: 400 }
            );
        }

        const { query, model = ModelEnum.GEMINI_2_5_FLASH } = validation.data;

        // Check if user has any documents
    const userDocuments = documentStore.getAllDocuments(userId);
        if (userDocuments.length === 0) {
            return NextResponse.json({
                response: "You haven't uploaded any documents yet. Please upload documents first to ask questions about them.",
                sources: [],
                documentsCount: 0,
            });
        }

        // Generate RAG response
    const result = await documentStore.generateRAGResponse(query, userId, model);

        return NextResponse.json({
            response: result.response,
            sources: result.sources.map(chunk => ({
                documentId: chunk.documentId,
                filename: chunk.metadata.filename,
                content: chunk.content.substring(0, 200) + '...', // Preview
                chunkIndex: chunk.metadata.chunkIndex,
            })),
            documentsCount: userDocuments.length,
            totalChunks: userDocuments.reduce((sum, doc) => sum + doc.chunks.length, 0),
        });

    } catch (error) {
        apiLogger.error('Document query error', error, { endpoint: 'POST' });
        return NextResponse.json(
            { error: 'Internal server error during document query' },
            { status: 500 }
        );
    }
}

// GET endpoint to retrieve user's documents
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        const userId = session?.userId ?? undefined;

        if (!userId) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        
    const documents = documentStore.getAllDocuments(userId);
        
        const documentsSummary = documents.map(doc => ({
            id: doc.id,
            filename: doc.filename,
            fileType: doc.fileType,
            size: doc.size,
            chunkCount: doc.chunks.length,
            uploadedAt: doc.uploadedAt,
        }));

        return NextResponse.json({
            documents: documentsSummary,
            totalDocuments: documents.length,
            totalChunks: documents.reduce((sum, doc) => sum + doc.chunks.length, 0),
        });

    } catch (error) {
        apiLogger.error('Error retrieving documents', error, { endpoint: 'GET' });
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}