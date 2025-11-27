
<img width="1512" alt="Screenshot 2025-04-14 at 9 13 25 PM" src="https://github.com/user-attachments/assets/b89d1343-7c6f-4685-8bcf-dbcc71ce2229" />

## Introduction

[Chatbot](https://chatbot.adityamer.live) is a sophisticated AI-powered chatbot platform that prioritizes privacy while offering powerful research and agentic capabilities. Built as a monorepo with Next.js, TypeScript, and cutting-edge AI technologies, it provides multiple specialized chat modes including Pro Search and Deep Research for in-depth analysis of complex topics.

Chatbot stands out with its workflow orchestration system and focus on privacy, storing all user data locally in the browser using IndexedDB, ensuring your conversations never leave your device.

## GitHub-powered changelog

The `/changelog` page now reads commit activity directly from GitHub, beginning with the initial clone of the
[`llmchatco`](https://github.com/llmchatco/llmchatco) project and including every commit you push to this fork.
By default, it targets this repository (`Aditya190803/llmchat` on the `main` branch). You can customize the
source or raise the API rate limit with the following optional environment variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_GITHUB_OWNER` | GitHub owner/organization for the changelog feed | `Aditya190803` |
| `NEXT_PUBLIC_GITHUB_REPO` | Repository name to read commits from | `llmchat` |
| `NEXT_PUBLIC_GITHUB_BRANCH` | Branch to display in the changelog | `main` |
| `GITHUB_TOKEN` (or `GITHUB_PERSONAL_ACCESS_TOKEN`, `GITHUB_API_TOKEN`, `NEXT_PUBLIC_GITHUB_TOKEN`) | Personal access token used to increase rate limits or access private repos | _unset_ |

> **Note:** The changelog gracefully falls back to a helpful error message if the GitHub API cannot be reached.
> Providing a token with `repo:read` scope is recommended for production deployments that expect traffic beyond
> GitHub's unauthenticated limits (60 requests per hour).

## Key Features

**Advanced Research Modes**


**Multiple LLM Provider Support**

**Branching Conversations**
- Generate alternate replies for any turn using different models or temperatures
- Navigate branches inline with `<current/total>` indicators and quick prev/next controls
- Preserve full history for each variant without losing the original response
- Rewrites stay in-place with a shared branch switcher right above each answer
- Use keyboard arrow keys in chat actions or the composer to flip between branches

**Voice Input**
- Capture prompts hands-free with built-in speech-to-text in the chat composer
- Live transcript preview before committing dictated text
- Graceful fallback messaging when the Web Speech API is unavailable

**Privacy-Focused**


**Agentic Capabilities**

## Sidebar behavior
- The navigation sidebar no longer auto-collapses on desktop when opening a chat/thread from the history list. It remains open if it was open. On mobile, the left drawer still closes to reveal the chat content. See `packages/common/components/side-bar.tsx` around the `HistoryItem` dismiss handler.
## Architecture

Chatbot is built as a monorepo with a clear separation of concerns:

```
├── apps/
│   ├── web/         # Next.js web application
│   └── desktop/     # Desktop application
│
└── packages/
    ├── ai/          # AI models and workflow orchestration
    ├── actions/     # Shared actions and API handlers
    ├── common/      # Common utilities and hooks
    ├── orchestrator/# Workflow engine and task management
    ├── prisma/      # Database schema and client
    ├── shared/      # Shared types and constants
    ├── ui/          # Reusable UI components
    ├── tailwind-config/ # Shared Tailwind configuration
    └── typescript-config/ # Shared TypeScript configuration
```

## Workflow Orchestration

Chatbot's workflow orchestration enables powerful agentic capabilities through a modular, step-by-step approach. Here's how to create a research agent:

### 1. Define Event and Context Types

First, establish the data structure for events and context:

```typescript
// Define the events emitted by each task
type AgentEvents = {
    taskPlanner: {
        tasks: string[];
        query: string;
    };
    informationGatherer: {
        searchResults: string[];
    };
    informationAnalyzer: {
        analysis: string;
        insights: string[];
    };
    reportGenerator: {
        report: string;
    };
};

// Define the shared context between tasks
type AgentContext = {
    query: string;
    tasks: string[];
    searchResults: string[];
    analysis: string;
    insights: string[];
    report: string;
};
```

### 2. Initialize Core Components

Next, set up the event emitter, context, and workflow builder:

```typescript
import { OpenAI } from 'openai';
import { createTask } from 'task';
import { WorkflowBuilder } from './builder';
import { Context } from './context';
import { TypedEventEmitter } from './events';

// Initialize event emitter with proper typing
const events = new TypedEventEmitter<AgentEvents>();

// Create the workflow builder with proper context
const builder = new WorkflowBuilder<AgentEvents, AgentContext>('research-agent', {
    events,
    context: new Context<AgentContext>({
        query: '',
        tasks: [],
        searchResults: [],
        analysis: '',
        insights: [],
        report: '',
    }),
});

// Initialize LLM client
const llm = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
```

### 3. Define Research Tasks

Create specialized tasks for each step of the research process:

#### Planning Task

```typescript
// Task Planner: Breaks down a research query into specific tasks
const taskPlanner = createTask({
    name: 'taskPlanner',
    execute: async ({ context, data }) => {
        const userQuery = data?.query || 'Research the impact of AI on healthcare';

        const planResponse = await llm.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a task planning assistant that breaks down research queries into specific search tasks.',
                },
                {
                    role: 'user',
                    content: `Break down this research query into specific search tasks: "${userQuery}". Return a JSON array of tasks.`,
                },
            ],
            response_format: { type: 'json_object' },
        });

        const content = planResponse.choices[0].message.content || '{"tasks": []}';
        const parsedContent = JSON.parse(content);
        const tasks = parsedContent.tasks || [];

        context?.set('query', userQuery);
        context?.set('tasks', tasks);

        return {
            tasks,
            query: userQuery,
        };
    },
    route: () => 'informationGatherer',
});
```

#### Information Gathering Task

```typescript
// Information Gatherer: Searches for information based on tasks
const informationGatherer = createTask({
    name: 'informationGatherer',
    dependencies: ['taskPlanner'],
    execute: async ({ context, data }) => {
        const tasks = data.taskPlanner.tasks;
        const searchResults: string[] = [];

        // Process each task to gather information
        for (const task of tasks) {
            const searchResponse = await llm.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a search engine that returns factual information.',
                    },
                    {
                        role: 'user',
                        content: `Search for information about: ${task}. Return relevant facts and data.`,
                    },
                ],
            });

            const result = searchResponse.choices[0].message.content || '';
            if (result) {
                searchResults.push(result);
            }
        }

        context?.set('searchResults', searchResults);

        return {
            searchResults,
        };
    },
    route: () => 'informationAnalyzer',
});
```

#### Analysis Task

```typescript
// Information Analyzer: Analyzes gathered information for insights
const informationAnalyzer = createTask({
    name: 'informationAnalyzer',
    dependencies: ['informationGatherer'],
    execute: async ({ context, data }) => {
        const searchResults = data.informationGatherer.searchResults;
        const query = context?.get('query') || '';

        const analysisResponse = await llm.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content:
                        'You are an analytical assistant that identifies patterns and extracts insights from information.',
                },
                {
                    role: 'user',
                    content: `Analyze the following information regarding "${query}" and provide a coherent analysis with key insights:\n\n${searchResults.join('\n\n')}`,
                },
            ],
            response_format: { type: 'json_object' },
        });

        const content =
            analysisResponse.choices[0].message.content || '{"analysis": "", "insights": []}';
        const parsedContent = JSON.parse(content);
        const analysis = parsedContent.analysis || '';
        const insights = parsedContent.insights || [];

        context?.set('analysis', analysis);
        context?.set('insights', insights);

        return {
            analysis,
            insights,
        };
    },
    route: () => 'reportGenerator',
});
```

#### Report Generation Task

```typescript
// Report Generator: Creates a comprehensive report
const reportGenerator = createTask({
    name: 'reportGenerator',
    dependencies: ['informationAnalyzer'],
    execute: async ({ context, data }) => {
        const { analysis, insights } = data.informationAnalyzer;
        const { query, searchResults } = context?.getAll() || { query: '', searchResults: [] };

        const reportResponse = await llm.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a report writing assistant that creates comprehensive, well-structured reports.',
                },
                {
                    role: 'user',
                    content: `Create a comprehensive report on "${query}" using the following analysis and insights.\n\nAnalysis: ${analysis}\n\nInsights: ${insights.join('\n- ')}\n\nStructure the report with an executive summary, key findings, detailed analysis, and conclusions.`,
                },
            ],
        });

        const report = reportResponse.choices[0].message.content || '';

        context?.set('report', report);

        return {
            report,
        };
    },
    route: () => 'end',
});
```

### 4. Build and Execute the Workflow

Finally, assemble and run the workflow:

```typescript
// Add all tasks to the workflow
builder.addTask(taskPlanner);
builder.addTask(informationGatherer);
builder.addTask(informationAnalyzer);
builder.addTask(reportGenerator);

// Build the workflow
const workflow = builder.build();

// Start the workflow with an initial query
workflow.start('taskPlanner', { query: 'Research the impact of AI on healthcare' });

// Export the workflow for external use
export const researchAgent = workflow;
```

The workflow processes through these stages:

1. **Planning**: Breaks down complex questions into specific research tasks
2. **Information Gathering**: Collects relevant data for each task
3. **Analysis**: Synthesizes information and identifies key insights
4. **Report Generation**: Produces a comprehensive, structured response

Each step emits events that can update the UI in real-time, allowing users to see the research process unfold.

## Local Storage
Chatbot prioritizes user privacy by storing all data locally

## Tech Stack

### Frontend

- **Next.js 14**: React framework with server components
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations
- **Shadcn UI**: Component library
- **Tiptap**: Rich text editor
- **Zustand**: State management
- **Dexie.js**: Used for IndexedDB interaction with a simple and powerful API
- **AI SDK**: Unified interface for multiple AI providers

### Development

- **Turborepo**: Monorepo management
- **Bun**: JavaScript runtime and package manager
- **ESLint & Prettier**: Code quality tools
- **Husky**: Git hooks
- **Vitest**: Unit and integration testing

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘/Ctrl + K` | Open command search |
| `Alt + N` | New thread |
| `Escape` | Close dialogs/modals |
| `Enter` | Send message (desktop) |
| `Shift + Enter` | New line in message |

## Getting Started

### Prerequisites

- Ensure you have `bun` installed (recommended) or `yarn`

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Aditya190803/chatbot.git
cd chatbot
```

2. Install dependencies:

```bash
bun install
# or
yarn install
```

3. Start the development server:

```bash
bun dev
# or
yarn dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Environment Variables

Create a `.env.local` file in `apps/web/` with the following variables:

### Required for AI Chat
| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for primary AI capabilities |
| `OPENROUTER_API_KEY` | OpenRouter API key for accessing multiple LLM providers |

### Optional - Cloud Sync (Appwrite)
| Variable | Description |
|----------|-------------|
| `APPWRITE_ENDPOINT` | Appwrite server endpoint |
| `APPWRITE_PROJECT_ID` | Appwrite project ID |
| `APPWRITE_API_KEY` | Appwrite API key for server operations |
| `APPWRITE_DATABASE_ID` | Database ID for storing threads |
| `APPWRITE_THREADS_COLLECTION_ID` | Collection ID for thread documents |

### Optional - Web Search
| Variable | Description |
|----------|-------------|
| `LANGSEARCH_API_KEY` | LangSearch API token for web search in research modes |
| `SERPER_API_KEY` | Fallback search provider |

### Optional - Analytics & Logging
| Variable | Description |
|----------|-------------|
| `LOG_LEVEL` | Set to `debug`, `info`, `warn`, or `error` (default: `info`) |
| `LANGFUSE_PUBLIC_KEY` | Langfuse analytics public key |
| `LANGFUSE_SECRET_KEY` | Langfuse analytics secret key |

### Web Search Configuration

Chatbot ships with LangSearch as the default web search provider used by research workflows. Configure these environment variables (see `apps/web/.env.example`) to enable live search:

- `LANGSEARCH_API_KEY` (required): LangSearch API token. Without this key, web-powered chat modes fall back to static reasoning only.
- `LANGSEARCH_COUNT` (optional): Override the default number of search results LangSearch returns per query.
- `LANGSEARCH_FRESHNESS` (optional): Restrict results to a relative time window such as `7d` or `30d`.
- `LANGSEARCH_ENABLE_SUMMARY` (optional, default `true`): When set to `false`, disables LangSearch server-side summarization.
- `LANGSEARCH_ENABLE_SERPER_FALLBACK` (optional, default `false`): When `true` and `SERPER_API_KEY` is provided, automatically retries with Serper if LangSearch is unavailable.
- `SERPER_API_KEY` (optional): API key for the Serper fallback provider.

When running locally, set these variables in `apps/web/.env.local`, then restart the dev server to pick up the changes.

## Testing

Run the test suite using Vitest:

```bash
# Run tests in watch mode
bun test

# Run tests once
bun test:run

# Run tests with coverage
bun test:coverage
```

Tests are located alongside source files with `.test.ts` or `.spec.ts` extensions.
