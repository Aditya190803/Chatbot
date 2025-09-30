import { auth } from '@clerk/nextjs/server';
import { getLanguageModel } from '@repo/ai/providers';
import { ModelEnum } from '@repo/ai/models';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const messageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
});

const titleGenerationRequestSchema = z.object({
    threadId: z.string(),
    conversation: z.array(messageSchema).min(2),
    stage: z.enum(['initial', 'refine']).default('initial'),
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

        const { threadId, conversation, stage } = validatedData.data;

        // Generate a concise title using Gemini 2.5 Flash
        const model = getLanguageModel(ModelEnum.GEMINI_2_5_FLASH);

        const conversationText = conversation
            .map((message, index) => {
                const speaker = message.role === 'user' ? 'User' : 'Assistant';
                return `${index + 1}. ${speaker}: ${message.content}`;
            })
            .join('\n');

        const instructions =
            stage === 'initial'
                ? `This is the first exchange in a new chat thread. Craft a clear, specific title (4-6 words) that captures the essence of the user's request and assistant's response.`
                : `You now have three full exchanges from this chat. Using the broader context, craft a refined title (4-7 words) that captures the main objective or topic driving the conversation.`;

        const prompt = `You are a helpful assistant responsible for naming chat threads.

${instructions}

Guidelines:
- Use Title Case (Capitalize Major Words)
- Be specific and descriptive
- Avoid vague words like "Chat" or "Conversation"
- No punctuation except necessary hyphens or apostrophes
- Respond with the title only, no quotations.

Conversation:
${conversationText}

Title:`;

        const { text: title } = await generateText({
            model,
            prompt,
            maxTokens: 50,
        });

        // Clean up the title (remove quotes, trim, etc.)
    const cleanTitle = title.trim().replace(/^['"]|['"]$/g, '').slice(0, 80);

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