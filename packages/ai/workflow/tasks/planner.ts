import { createTask } from '@repo/orchestrator';
import { z } from 'zod';
import { ModelEnum } from '../../models';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { generateObject, getHumanizedDate, handleError, sendEvents } from '../utils';

export const plannerTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'planner',
    execute: async ({ trace, events, context, data, signal }) => {
        const messages = context?.get('messages') || [];
        const question = context?.get('question') || '';
        const currentYear = new Date().getFullYear();
        const { updateStep, nextStepId } = sendEvents(events);

        const stepId = nextStepId();

        const prompt = `
                        You're a strategic research planner with expertise in Indian market context. Your job is to analyze research questions and develop an initial approach to find accurate information through web searches, with a focus on Indian perspectives when relevant.
                        
                        **Research Question**:
                        <question>
                        ${question}
                        </question>
                        
                        **Your Task**:
                        1. Identify the 1-2 most important initial aspects of this question to research first
                        2. Formulate 1-2 precise search queries that will yield the most relevant initial information
                        3. Focus on establishing a foundation of knowledge before diving into specifics
                        4. When applicable, prioritize Indian context, regulations, currency (INR), and local market conditions
                        
                        **Indian Context Guidelines**:
                        - For financial topics: Consider Indian banking systems, RBI regulations, GST implications, INR currency
                        - For business topics: Include Indian market dynamics, startup ecosystem, regulatory environment
                        - For technology topics: Consider Indian tech landscape, digital initiatives like Digital India, UPI
                        - For legal topics: Focus on Indian laws, Supreme Court judgments, parliamentary acts
                        - For economic topics: Include Indian economy, GDP figures in INR, market cap in INR
                        - For social topics: Consider Indian demographics, cultural aspects, regional variations
                        
                        **Search Strategy Guidelines**:
                        - Create targeted queries using search operators when appropriate
                        - Prioritize broad, foundational information for initial searches
                        - Include "India" or "Indian" in queries when the topic benefits from local context
                        - Ensure queries cover different high-priority aspects of the research question
                
                        ## Query Generation Rules

- DO NOT broaden the scope beyond the original research question
- DO NOT suggest queries that would likely yield redundant information
- Each query must explore a distinct aspect
- Limit to 1-2 highly targeted queries maximum
- Format queries as direct search terms, NOT as questions
- DO NOT start queries with "how", "what", "when", "where", "why", or "who"
- Use concise keyword phrases instead of full sentences
- Use time period in queries when needed
- Maximum 8 words per query
- If user question is clear and concise, you can use it as one of the queries
- Add "India" or "Indian" context when relevant to the query

**Current date and time: **${getHumanizedDate()}**

## Examples of Good Indian Context Queries:
- "Indian startup valuation 2024 INR"
- "RBI cryptocurrency regulations India 2024"
- "Digital India UPI adoption statistics"
- "Indian stock market NSE BSE 2024"

## Examples of Bad Queries:
- "How long does a Tesla Model 3 battery last?"
- "What are the economic impacts of climate change?"
- "When should I use async await in JavaScript?"
- "Why is remote work increasing productivity?"

**Important**:
- Use current date and time for the queries unless specifically asked for a different time period
- Prioritize Indian sources and context when the topic is relevant to India
- Use INR for financial figures when discussing Indian markets
                        
                        **Output Format (JSON)**:
                        - reasoning: A brief explanation of your first step to research the question, highlighting Indian context when relevant
                        - queries: 2 well-crafted search queries (4-8 words) that targets the most important aspects with Indian context when applicable
                `;

        const object = await generateObject({
            prompt,
            model: ModelEnum.GEMINI_2_5_PRO,
            schema: z.object({
                reasoning: z.string(),
                queries: z.array(z.string()),
            }),
            messages: messages as any,
            signal,
        });

        context?.update('queries', current => [...(current ?? []), ...(object?.queries || [])]);
        // Update flow event with initial goal

        updateStep({
            stepId,
            text: object.reasoning,
            stepStatus: 'PENDING',
            subSteps: {
                search: {
                    status: 'COMPLETED',
                    data: object.queries,
                },
            },
        });

        trace?.span({
            name: 'planner',
            input: prompt,
            output: object,
            metadata: {
                data,
            },
        });

        return {
            queries: object.queries,
            stepId,
        };
    },
    onError: handleError,
    route: ({ result }) => 'web-search',
});
