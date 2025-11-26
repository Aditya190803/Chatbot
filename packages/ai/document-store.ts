import { generateText } from 'ai';
import { logger } from '@repo/shared/logger';
import { ModelEnum } from './models';
import { getLanguageModel } from './providers';

export interface DocumentChunk {
    id: string;
    documentId: string;
    content: string;
    embedding?: number[];
    metadata: {
        filename: string;
        chunkIndex: number;
        startPosition: number;
        endPosition: number;
    };
}

export interface ProcessedDocument {
    id: string;
    filename: string;
    fileType: string;
    size: number;
    chunks: DocumentChunk[];
    uploadedAt: Date;
    userId?: string;
}

/**
 * Simple in-memory document store with basic similarity search
 * In production, you would use a proper vector database like:
 * - Pinecone
 * - Weaviate
 * - ChromaDB
 * - Supabase Vector
 * - PGVector
 */
export class DocumentStore {
    private static instance: DocumentStore;
    private documents: Map<string, ProcessedDocument> = new Map();
    private chunks: Map<string, DocumentChunk> = new Map();

    private constructor() {}

    static getInstance(): DocumentStore {
        if (!DocumentStore.instance) {
            DocumentStore.instance = new DocumentStore();
        }
        return DocumentStore.instance;
    }

    async addDocument(
        documentId: string,
        filename: string,
        fileType: string,
        size: number,
        textContent: string,
        userId?: string
    ): Promise<ProcessedDocument> {
        // Chunk the document
        const chunks = this.chunkText(textContent, 800, 100);
        const documentChunks: DocumentChunk[] = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunkId = `${documentId}_chunk_${i}`;
            const chunk: DocumentChunk = {
                id: chunkId,
                documentId,
                content: chunks[i],
                metadata: {
                    filename,
                    chunkIndex: i,
                    startPosition: i * 700, // Approximate position
                    endPosition: (i * 700) + chunks[i].length,
                },
            };

            // In a real implementation, you would generate embeddings here
            // For now, we'll use simple keyword matching for similarity search
            documentChunks.push(chunk);
            this.chunks.set(chunkId, chunk);
        }

        const processedDocument: ProcessedDocument = {
            id: documentId,
            filename,
            fileType,
            size,
            chunks: documentChunks,
            uploadedAt: new Date(),
            userId,
        };

        this.documents.set(documentId, processedDocument);
        return processedDocument;
    }

    getDocument(documentId: string): ProcessedDocument | undefined {
        return this.documents.get(documentId);
    }

    getAllDocuments(userId?: string): ProcessedDocument[] {
        const allDocs = Array.from(this.documents.values());
        if (userId) {
            return allDocs.filter(doc => doc.userId === userId);
        }
        return allDocs;
    }

    removeDocument(documentId: string): boolean {
        const document = this.documents.get(documentId);
        if (!document) return false;

        // Remove all chunks
        document.chunks.forEach(chunk => {
            this.chunks.delete(chunk.id);
        });

        // Remove document
        this.documents.delete(documentId);
        return true;
    }

    /**
     * Simple similarity search based on keyword matching
     * In production, use vector embeddings and cosine similarity
     */
    async searchSimilarChunks(
        query: string, 
        limit: number = 5, 
        userId?: string
    ): Promise<DocumentChunk[]> {
        const queryWords = query.toLowerCase().split(/\s+/);
        const scores: { chunk: DocumentChunk; score: number }[] = [];

        // Get all chunks for the user
        const userDocuments = this.getAllDocuments(userId);
        const allChunks = userDocuments.flatMap(doc => doc.chunks);

        for (const chunk of allChunks) {
            const chunkWords = chunk.content.toLowerCase().split(/\s+/);
            let score = 0;

            // Simple scoring: count matching words
            for (const queryWord of queryWords) {
                if (queryWord.length < 3) continue; // Skip short words
                
                for (const chunkWord of chunkWords) {
                    if (chunkWord.includes(queryWord) || queryWord.includes(chunkWord)) {
                        score += 1;
                    }
                }
            }

            // Bonus for exact phrase matches
            if (chunk.content.toLowerCase().includes(query.toLowerCase())) {
                score += 5;
            }

            if (score > 0) {
                scores.push({ chunk, score });
            }
        }

        // Sort by score and return top results
        return scores
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => item.chunk);
    }

    /**
     * Generate a response using RAG (Retrieval Augmented Generation)
     */
    async generateRAGResponse(
        query: string,
        userId?: string,
        model: ModelEnum = ModelEnum.GEMINI_2_5_FLASH
    ): Promise<{ response: string; sources: DocumentChunk[] }> {
        // Retrieve relevant chunks
        const relevantChunks = await this.searchSimilarChunks(query, 3, userId);

        if (relevantChunks.length === 0) {
            return {
                response: "I couldn't find any relevant information in your uploaded documents to answer this question. Please make sure you've uploaded documents related to your query.",
                sources: [],
            };
        }

        // Create context from retrieved chunks
        const context = relevantChunks
            .map((chunk, index) => `[Document ${index + 1}: ${chunk.metadata.filename}]\n${chunk.content}`)
            .join('\n\n---\n\n');

        // Generate response using the context
        const prompt = `You are a helpful assistant that answers questions based on the provided document context. Use only the information from the context to answer the user's question. If the context doesn't contain enough information to answer the question, say so clearly.

Context from uploaded documents:
${context}

User Question: ${query}

Instructions:
- Answer based only on the provided context
- Be specific and cite relevant details from the documents
- If the context doesn't contain enough information, acknowledge this limitation
- Keep your answer clear and concise

Answer:`;

        try {
            const languageModel = getLanguageModel(model);
            const { text: response } = await generateText({
                model: languageModel,
                prompt,
                maxTokens: 1000,
            });

            return {
                response: response.trim(),
                sources: relevantChunks,
            };
        } catch (error) {
            logger.error('Error generating RAG response', error as Error);
            return {
                response: 'I encountered an error while processing your question. Please try again.',
                sources: relevantChunks,
            };
        }
    }

    private chunkText(text: string, chunkSize: number, overlap: number): string[] {
        const chunks: string[] = [];
        let start = 0;

        while (start < text.length) {
            let end = Math.min(start + chunkSize, text.length);
            let chunk = text.slice(start, end);
            
            // Try to break at sentence boundaries for better chunks
            if (end < text.length) {
                const lastPeriod = chunk.lastIndexOf('.');
                const lastNewline = chunk.lastIndexOf('\n');
                const breakPoint = Math.max(lastPeriod, lastNewline);
                
                if (breakPoint > chunk.length * 0.7) {
                    chunk = chunk.slice(0, breakPoint + 1);
                    end = start + breakPoint + 1;
                }
            }
            
            chunks.push(chunk.trim());
            
            // Move start position, accounting for overlap
            start = end - overlap;
            
            // If we're at the end, break to avoid infinite loop
            if (end === text.length) break;
        }

        return chunks.filter(chunk => chunk.length > 0);
    }
}

export const documentStore = DocumentStore.getInstance();