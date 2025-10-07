'use client';
import { costTracker } from '@repo/ai/models';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { IconCoin, IconEye, IconEyeOff } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

export function CostTracker() {
    const [stats, setStats] = useState(costTracker.getUsageStats());
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setStats(costTracker.getUsageStats());
        }, 30000); // Update every 30 seconds

        return () => clearInterval(interval);
    }, []);

    if (!isVisible) {
        return (
            <div className="fixed bottom-4 right-4">
                <button
                    onClick={() => setIsVisible(true)}
                    className="flex items-center gap-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 px-3 py-2 text-xs text-muted-foreground hover:bg-background/90 transition-colors"
                >
                    <IconEye size={14} />
                    Cost Tracker
                </button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 w-80">
            <Card className="bg-background/95 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <IconCoin size={16} className="text-amber-500" />
                            Usage (24h)
                        </CardTitle>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <IconEyeOff size={14} />
                        </button>
                    </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <div className="text-muted-foreground">Requests</div>
                            <div className="font-medium">{stats.requestCount}</div>
                        </div>
                        <div>
                            <div className="text-muted-foreground">Est. Cost</div>
                            <div className="font-medium">
                                {stats.totalCost > 0 
                                    ? `$${stats.totalCost.toFixed(4)}` 
                                    : 'Free'
                                }
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-xs">
                        <div className="text-muted-foreground mb-1">Tokens</div>
                        <div className="text-[11px] text-muted-foreground/80">
                            Input: {stats.totalInputTokens.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-muted-foreground/80">
                            Output: {stats.totalOutputTokens.toLocaleString()}
                        </div>
                    </div>

                    {Object.keys(stats.modelBreakdown).length > 0 && (
                        <div className="text-xs">
                            <div className="text-muted-foreground mb-1">Models Used</div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {Object.entries(stats.modelBreakdown).map(([model, usage]) => (
                                    <div key={model} className="flex justify-between text-[11px]">
                                        <span className="text-muted-foreground/80 truncate">
                                            {model.split('/').pop()?.split(':')[0] || model}
                                        </span>
                                        <span className="text-muted-foreground/60">
                                            {usage.count}x
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}