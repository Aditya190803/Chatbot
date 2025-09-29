import { auth } from '@clerk/nextjs/server';
import { getLanguageModel } from '@repo/ai/providers';
import { ModelEnum } from '@repo/ai/models';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const titleGenerationRequestSchema = z.object({
    threadId: z.string(),
    userMessage: z.string(),
    assistantResponse: z.string(),
});

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        const userId = session?.userId;

        const body = await request.json();
        const validatedData = titleGenerationRequestSchema.safeParse(body);

        if (!validatedData.success) {
            return NextResponse.json(
                { error: 'Invalid request data', details: validatedData.error.format() },
                { status: 400 }
            );
        }

        const { threadId, userMessage, assistantResponse } = validatedData.data;

        // Generate a concise title using Gemini 2.5 Flash
        const model = getLanguageModel(ModelEnum.GEMINI_2_5_FLASH);
        
        const prompt = `Based on the following conversation, generate a concise, descriptive title (4-6 words maximum) that captures the main topic or question being discussed.

User: ${userMessage}
Assistant: ${assistantResponse}

Rules:
- Keep it under 6 words
- Make it specific and descriptive
- Use title case
- Focus on the main topic or question
- Avoid generic phrases like "Chat about" or "Question regarding"

Generate only the title, nothing else:`;

        const { text: title } = await generateText({
            model,
            prompt,
            maxTokens: 50,
        });

        // Clean up the title (remove quotes, trim, etc.)
        const cleanTitle = title.trim().replace(/^["']|["']$/g, '').substring(0, 60);

        return NextResponse.json({ 
            title: cleanTitle,
            threadId 
        });

    } catch (error) {
        console.error('Error generating title:', error);
        return NextResponse.json(
            { error: 'Failed to generate title' },
            { status: 500 }
        );
    }
}