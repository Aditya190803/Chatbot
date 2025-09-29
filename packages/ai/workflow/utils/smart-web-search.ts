import { generateObject } from '../utils';
import { ModelEnum } from '../../models';
import { z } from 'zod';
import { CoreMessage } from 'ai';

/**
 * Analyzes a user query to determine if web search is necessary
 * for providing an accurate and up-to-date response
 */
export async function shouldUseWebSearch(
    messages: CoreMessage[],
    signal?: AbortSignal
): Promise<{ shouldSearch: boolean; reasoning: string }> {
    if (!messages.length) {
        return { shouldSearch: false, reasoning: 'No messages to analyze' };
    }

    // Get the latest user message
    const latestUserMessage = messages
        .filter(msg => msg.role === 'user')
        .pop();

    if (!latestUserMessage || !latestUserMessage.content) {
        return { shouldSearch: false, reasoning: 'No user query found' };
    }

    const query = typeof latestUserMessage.content === 'string' ? 
        latestUserMessage.content : 
        latestUserMessage.content.map(part => 
            part.type === 'text' ? part.text : ''
        ).join(' ');

    const analysisPrompt = `
You are an AI assistant that determines whether a web search is necessary to answer a user's query accurately.

**IMPORTANT GUIDELINES:**
- Only recommend web search when the query explicitly requires CURRENT, REAL-TIME, or RECENT information
- Do NOT recommend web search for general knowledge, explanations, or how-to questions that don't require current data
- Consider the following indicators that typically require web search:

**REQUIRE WEB SEARCH:**
- Current date/time specific queries ("today", "this week", "recent", "latest")
- Real-time data (stock prices, weather, exchange rates, sports scores)
- Recent events, news, or developments
- Current status of ongoing situations
- Latest versions, releases, or updates
- Live statistics or metrics
- Breaking news or trending topics
- Current market conditions or prices

**DO NOT REQUIRE WEB SEARCH:**
- General explanations or educational content
- Historical facts or established knowledge
- How-to guides or tutorials
- Theoretical concepts or definitions
- Code examples or programming help
- Mathematical calculations
- Creative writing or brainstorming
- Personal advice or opinions

**ANALYZE THE QUERY:**
Query: "${query}"

Consider:
1. Does this query require current/real-time information?
2. Is the user asking about recent events or developments?
3. Would the answer be significantly different if I had access to the latest information?
4. Are there time-sensitive elements in the query?

Be conservative - only recommend web search when it's clearly necessary for accuracy.
`;

    try {
        const result = await generateObject({
            prompt: analysisPrompt,
            model: ModelEnum.GEMINI_2_5_FLASH, // Use a fast model for analysis
            schema: z.object({
                shouldSearch: z.boolean().describe('Whether web search is necessary for this query'),
                reasoning: z.string().describe('Brief explanation of why web search is or isn\'t needed'),
                confidence: z.number().min(0).max(1).describe('Confidence level in the decision (0-1)'),
                indicators: z.array(z.string()).describe('Specific indicators that influenced the decision')
            }),
            signal
        });

        if (!result) {
            return { shouldSearch: false, reasoning: 'Failed to analyze query' };
        }

        return {
            shouldSearch: result.shouldSearch && result.confidence > 0.7, // Require high confidence
            reasoning: result.reasoning
        };
    } catch (error) {
        console.error('Error in shouldUseWebSearch:', error);
        return { shouldSearch: false, reasoning: 'Analysis failed, defaulting to no search' };
    }
}

/**
 * Enhanced web search decision that also considers conversation context
 */
export async function shouldUseWebSearchWithContext(
    messages: CoreMessage[],
    hasNativeInternet: boolean,
    userEnabledWebSearch: boolean,
    signal?: AbortSignal
): Promise<{ shouldSearch: boolean; reasoning: string; autoEnabled: boolean }> {
    // If user already enabled web search, use it
    if (userEnabledWebSearch) {
        return { 
            shouldSearch: true, 
            reasoning: 'User manually enabled web search',
            autoEnabled: false 
        };
    }

    // If model doesn't have native internet access, don't auto-enable
    if (!hasNativeInternet) {
        return { 
            shouldSearch: false, 
            reasoning: 'Model does not have native internet access capabilities',
            autoEnabled: false 
        };
    }

    // Use AI to determine if web search is needed
    const analysis = await shouldUseWebSearch(messages, signal);
    
    return {
        shouldSearch: analysis.shouldSearch,
        reasoning: analysis.reasoning,
        autoEnabled: analysis.shouldSearch // Auto-enabled if AI recommends it
    };
}