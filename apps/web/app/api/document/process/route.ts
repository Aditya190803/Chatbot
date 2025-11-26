import { auth } from '@repo/common/auth/server';
import { documentStore } from '@repo/ai/document-store';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import * as XLSX from 'xlsx';
import { logger } from '@repo/shared/logger';

const apiLogger = logger.child({ module: 'api/document/process' });

const processDocumentSchema = z.object({
    documentId: z.string(),
});

const SUPPORTED_MIME_TYPES: Record<string, 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'txt' | 'md'> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt',
    'text/markdown': 'md',
};

const LEGACY_OFFICE_MIME_TYPES = new Set([
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MIN_CONTENT_LENGTH = 50;

const collectTextFromNode = (node: unknown, acc: string[]): void => {
    if (node == null) {
        return;
    }

    if (typeof node === 'string') {
        const trimmed = node.trim();
        if (trimmed) {
            acc.push(trimmed);
        }
        return;
    }

    if (Array.isArray(node)) {
        node.forEach(child => collectTextFromNode(child, acc));
        return;
    }

    if (typeof node === 'object') {
        Object.values(node as Record<string, unknown>).forEach(value =>
            collectTextFromNode(value, acc)
        );
    }
};

const extractTextFromDocx = async (data: Uint8Array): Promise<string> => {
    const zip = await JSZip.loadAsync(data);
    const documentXml = zip.file('word/document.xml');

    if (!documentXml) {
        throw new Error('Invalid DOCX structure.');
    }

    const xmlContent = await documentXml.async('string');
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xmlContent);
    const textParts: string[] = [];
    collectTextFromNode(parsed, textParts);

    return textParts.join(' ').replace(/\s+/g, ' ').trim();
};

const extractTextFromPptx = async (data: Uint8Array): Promise<string> => {
    const zip = await JSZip.loadAsync(data);
    const slideFiles = Object.keys(zip.files)
        .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    if (!slideFiles.length) {
        throw new Error('No slides found in PPTX file.');
    }

    const parser = new XMLParser({ ignoreAttributes: false });
    const slideTexts: string[] = [];

    for (const fileName of slideFiles) {
        const slideXml = await zip.file(fileName)?.async('string');
        if (!slideXml) continue;

        const parsed = parser.parse(slideXml);
        const textParts: string[] = [];
        collectTextFromNode(parsed, textParts);

        if (textParts.length) {
            slideTexts.push(textParts.join(' ').replace(/\s+/g, ' ').trim());
        }
    }

    return slideTexts.join('\n\n');
};

const extractTextFromXlsx = (data: Uint8Array): string => {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetTexts: string[] = [];

    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
            return;
        }

        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false });
        rows.forEach(row => {
            if (!Array.isArray(row)) return;
            const cells = row
                .map(cell => (typeof cell === 'string' ? cell.trim() : String(cell ?? '').trim()))
                .filter(Boolean);
            if (cells.length) {
                sheetTexts.push(cells.join(' '));
            }
        });
    });

    return sheetTexts.join('\n');
};

const normalizeWhitespace = (value: string): string =>
    value
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[\t ]+/g, ' ')
        .trim();

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        const userId = session?.userId ?? undefined;

        if (!userId) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('document') as File;
        const documentId = formData.get('documentId') as string;

        if (!file) {
            return NextResponse.json({ error: 'No document file provided' }, { status: 400 });
        }

        const validation = processDocumentSchema.safeParse({ documentId });
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 10MB.' },
                { status: 400 }
            );
        }

        const fileCategory = SUPPORTED_MIME_TYPES[file.type];
        if (!fileCategory) {
            if (LEGACY_OFFICE_MIME_TYPES.has(file.type)) {
                return NextResponse.json(
                    {
                        error:
                            'Legacy Office formats (.doc, .ppt, .xls) are not supported. Please convert the file to DOCX, PPTX, or XLSX and try again.',
                    },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                {
                    error:
                        'Unsupported file type. Supported formats: PDF, DOCX, PPTX, XLSX, TXT, and MD.',
                },
                { status: 400 }
            );
        }

        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        let extractedText = '';

        switch (fileCategory) {
            case 'pdf': {
                try {
                    const pdfParse = require('pdf-parse');
                    const pdfData = await pdfParse(uint8Array);
                    extractedText = pdfData.text;
                } catch (error) {
                    apiLogger.error('PDF parsing error', error, { filename: file.name });
                    return NextResponse.json(
                        { error: 'Failed to parse PDF file.' },
                        { status: 400 }
                    );
                }
                break;
            }
            case 'docx':
                extractedText = await extractTextFromDocx(uint8Array);
                break;
            case 'pptx':
                extractedText = await extractTextFromPptx(uint8Array);
                break;
            case 'xlsx':
                extractedText = extractTextFromXlsx(uint8Array);
                break;
            case 'txt':
            case 'md':
                extractedText = Buffer.from(uint8Array).toString('utf-8');
                break;
            default:
                extractedText = '';
        }

        if (!extractedText || !extractedText.trim()) {
            return NextResponse.json(
                { error: 'No readable text content found in the document.' },
                { status: 400 }
            );
        }

        const cleanedText = normalizeWhitespace(extractedText);

        if (cleanedText.length < MIN_CONTENT_LENGTH) {
            return NextResponse.json(
                { error: 'Document content is too short (minimum 50 characters).' },
                { status: 400 }
            );
        }

        const processedDocument = await documentStore.addDocument(
            documentId,
            file.name,
            file.type,
            file.size,
            cleanedText,
            userId
        );

        const preview = cleanedText.slice(0, 200) + (cleanedText.length > 200 ? '…' : '');

        return NextResponse.json({
            documentId: processedDocument.id,
            filename: processedDocument.filename,
            fileType: processedDocument.fileType,
            size: processedDocument.size,
            textLength: cleanedText.length,
            chunkCount: processedDocument.chunks.length,
            status: 'processed',
            extractedText: preview,
        });
    } catch (error) {
        apiLogger.error('Document processing error', error, { endpoint: 'POST' });
        return NextResponse.json(
            { error: 'Internal server error during document processing.' },
            { status: 500 }
        );
    }
}