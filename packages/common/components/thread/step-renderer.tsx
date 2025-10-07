import { SearchResultsList, StepStatus, TextShimmer } from '@repo/common/components';
import { Step } from '@repo/shared/types';
import { Badge, cn } from '@repo/ui';
import { IconSearch, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import React, { useState } from 'react';

const normalizeText = (value?: string) =>
    typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

export type StepRendererType = {
    step: Step;
    thinkingProcess?: string;
};

export const StepRenderer = ({ step, thinkingProcess }: StepRendererType) => {
    const [thinkingExpanded, setThinkingExpanded] = useState(false);
    const normalizedThinking = normalizeText(thinkingProcess);
    const renderTextStep = () => {
        if (step?.text) {
            return (
                <motion.p
                    className="text-muted-foreground text-sm"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    {step.text}
                </motion.p>
            );
        }
        return null;
    };

    const renderSearchStep = () => {
        if (step?.steps && 'search' in step?.steps) {
            return (
                <motion.div
                    className="flex flex-col gap-1"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
                    <div className="flex flex-col gap-2">
                        <div className="w-[100px]">
                            <TextShimmer
                                duration={0.7}
                                spread={step.steps?.search?.status === 'COMPLETED' ? 0 : 2}
                                className="text-xs"
                            >
                                Searching
                            </TextShimmer>
                        </div>

                        <div className="flex flex-row flex-wrap gap-1">
                            {Array.isArray(step.steps?.search?.data) &&
                                step.steps?.search?.data?.map((query: string, index: number) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: 0.1 + index * 0.05 }}
                                    >
                                        <Badge>
                                            <IconSearch size={12} className="opacity-50" />
                                            {query}
                                        </Badge>
                                    </motion.div>
                                ))}
                        </div>
                    </div>
                </motion.div>
            );
        }
    };

    const renderReadStep = () => {
        if (step?.steps && 'read' in step.steps) {
            return (
                <motion.div
                    className="flex flex-col gap-2"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                >
                    <div className="w-[100px]">
                        <TextShimmer
                            duration={0.7}
                            spread={step.steps?.read?.status === 'COMPLETED' ? 0 : 2}
                            className="text-xs"
                        >
                            Reading
                        </TextShimmer>
                    </div>
                    <SearchResultsList
                        sources={Array.isArray(step.steps?.read?.data) ? step.steps.read.data : []}
                    />
                </motion.div>
            );
        }
        return null;
    };

    const renderReasoningStep = () => {
        if (step?.steps && 'reasoning' in step.steps) {
            const reasoningData =
                typeof step.steps?.reasoning?.data === 'string' ? step.steps.reasoning.data : '';

            const normalizedReasoning = normalizeText(reasoningData);
            const isDuplicateReasoning =
                normalizedReasoning.length > 0 &&
                normalizedThinking.length > 0 &&
                normalizedReasoning === normalizedThinking;

            if (isDuplicateReasoning) {
                return null;
            }

            return (
                <motion.div
                    className="flex flex-col gap-2"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                >
                    <div className="w-[100px]">
                        <TextShimmer
                            duration={0.7}
                            spread={step.steps?.reasoning?.status === 'COMPLETED' ? 0 : 2}
                            className="text-xs"
                        >
                            Analyzing
                        </TextShimmer>
                    </div>
                    <div className="flex flex-col gap-1">
                        <button
                            type="button"
                            onClick={() => setThinkingExpanded(v => !v)}
                            className="flex items-center gap-1 text-muted-foreground/80 hover:text-foreground text-xs transition-colors duration-150 hover:bg-muted/50 rounded px-1 py-0.5"
                        >
                            {thinkingExpanded ? (
                                <>
                                    <IconChevronDown size={12} />
                                    Hide analysis
                                </>
                            ) : (
                                <>
                                    <IconChevronRight size={12} />
                                    Show analysis
                                </>
                            )}
                        </button>
                        <div className={cn(
                            "overflow-hidden transition-all duration-200 ease-in-out",
                            thinkingExpanded ? "max-h-[40vh] opacity-100" : "max-h-0 opacity-0"
                        )}>
                            <div className="mt-1 p-2 rounded-md bg-muted/30 border border-border/20">
                                <div className="text-muted-foreground text-sm whitespace-pre-wrap font-mono leading-relaxed max-h-[35vh] overflow-y-auto">
                                    {reasoningData}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            );
        }
        return null;
    };

    const renderWrapupStep = () => {
        if (step?.steps && 'wrapup' in step.steps) {
            return (
                <motion.div
                    className="flex flex-col gap-2"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                >
                    <div className="w-[100px]">
                        <TextShimmer
                            duration={0.7}
                            spread={step.steps?.wrapup?.status === 'COMPLETED' ? 0 : 2}
                            className="text-xs"
                        >
                            Wrapping up
                        </TextShimmer>
                    </div>
                    <p>{step.steps?.wrapup?.data || ''}</p>
                </motion.div>
            );
        }
        return null;
    };

    return (
        <div className="flex w-full flex-row items-stretch justify-start gap-2">
            <div className="flex min-h-full shrink-0 flex-col items-center justify-start px-2">
                <div className="bg-border/50 h-1.5 shrink-0" />
                <div className="bg-background z-10">
                    <StepStatus status={step.status} />
                </div>
                <motion.div
                    className="border-border min-h-full w-[1px] flex-1 border-l border-dashed"
                    initial={{ height: 0 }}
                    animate={{ height: '100%' }}
                    transition={{ duration: 0.5 }}
                />
            </div>
            <motion.div
                className="flex w-full flex-1 flex-col gap-4 overflow-hidden pb-2 pr-2"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {renderWrapupStep()}
                {renderTextStep()}
                {renderReasoningStep()}
                {renderSearchStep()}
                {renderReadStep()}
            </motion.div>
        </div>
    );
};
