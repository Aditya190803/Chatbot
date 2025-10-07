import { ModelEnum, models } from './models';

export interface CostUsage {
    modelId: ModelEnum;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
    timestamp: Date;
    threadId?: string;
}

export class CostTracker {
    private static instance: CostTracker;
    private usage: CostUsage[] = [];

    private constructor() {}

    static getInstance(): CostTracker {
        if (!CostTracker.instance) {
            CostTracker.instance = new CostTracker();
        }
        return CostTracker.instance;
    }

    trackUsage(modelId: ModelEnum, inputTokens: number, outputTokens: number, threadId?: string): CostUsage {
        const model = models.find(m => m.id === modelId);
        
        let estimatedCost = 0;
        if (model && !model.isFree) {
            const inputCost = (inputTokens / 1000000) * (model.costPer1MInput || 0);
            const outputCost = (outputTokens / 1000000) * (model.costPer1MOutput || 0);
            estimatedCost = inputCost + outputCost;
        }

        const usage: CostUsage = {
            modelId,
            inputTokens,
            outputTokens,
            estimatedCost,
            timestamp: new Date(),
            threadId,
        };

        this.usage.push(usage);
        
        // Keep only last 1000 entries to prevent memory issues
        if (this.usage.length > 1000) {
            this.usage = this.usage.slice(-1000);
        }

        return usage;
    }

    getUsageStats(timeRangeHours = 24) {
        const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
        const recentUsage = this.usage.filter(u => u.timestamp > cutoff);
        
        const totalCost = recentUsage.reduce((sum, u) => sum + u.estimatedCost, 0);
        const totalInputTokens = recentUsage.reduce((sum, u) => sum + u.inputTokens, 0);
        const totalOutputTokens = recentUsage.reduce((sum, u) => sum + u.outputTokens, 0);
        
        const modelBreakdown = recentUsage.reduce((acc, u) => {
            if (!acc[u.modelId]) {
                acc[u.modelId] = { count: 0, cost: 0, inputTokens: 0, outputTokens: 0 };
            }
            acc[u.modelId].count++;
            acc[u.modelId].cost += u.estimatedCost;
            acc[u.modelId].inputTokens += u.inputTokens;
            acc[u.modelId].outputTokens += u.outputTokens;
            return acc;
        }, {} as Record<string, { count: number; cost: number; inputTokens: number; outputTokens: number }>);

        return {
            totalCost,
            totalInputTokens,
            totalOutputTokens,
            requestCount: recentUsage.length,
            modelBreakdown,
            timeRangeHours,
        };
    }

    getUsageForThread(threadId: string) {
        return this.usage.filter(u => u.threadId === threadId);
    }

    getCostEstimate(modelId: ModelEnum, inputTokens: number, outputTokens: number): number {
        const model = models.find(m => m.id === modelId);
        
        if (!model || model.isFree) {
            return 0;
        }

        const inputCost = (inputTokens / 1000000) * (model.costPer1MInput || 0);
        const outputCost = (outputTokens / 1000000) * (model.costPer1MOutput || 0);
        
        return inputCost + outputCost;
    }
}

export const costTracker = CostTracker.getInstance();