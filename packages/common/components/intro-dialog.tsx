import { cn, Dialog, DialogContent } from '@repo/ui';
import { IconCircleCheckFilled } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Logo } from './logo';
import { useAuth } from '@repo/common/context';
export const IntroDialog = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { isSignedIn } = useAuth();

    useEffect(() => {
        const hasSeenIntro = localStorage.getItem('hasSeenIntro');
        if (!hasSeenIntro) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem('hasSeenIntro', 'true');
        setIsOpen(false);
    };

    const icon = (
        <IconCircleCheckFilled className="text-muted-foreground/50 mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full" />
    );

    const points = [
        {
            icon,
            text: `**Privacy-focused**: Your chat history never leaves your device.`,
        },
        {
            icon,
            text: `**Open source**: Fully transparent and modifiable. Easily deploy it yourself.`,
        },
        {
            icon,
            text: `**Research-friendly**: Leverage Web Search, Pro Search, and Deep Research features.`,
        },
        {
            icon,
            text: `**Comprehensive model support**: Compatible with all mainstream model providers.`,
        },

        {
            icon,
            text: `**MCP Compatibility**: Connect with any MCP servers/tools (coming soon).`,
        },
        {
            icon,
            text: `**Usage Tracking**: Monitor your model usage without paying (coming soon).`,
        },
    ];

    if (isSignedIn) {
        return null;
    }

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="relative bg-background border-border w-full max-w-[420px] flex-col overflow-hidden rounded-lg border shadow-lg">
                        <button
                            onClick={handleClose}
                            className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-lg font-bold"
                            aria-label="Close dialog"
                        >
                            ×
                        </button>
                        
                        <div className="flex flex-col gap-6 p-6">
                            <div className="flex flex-col gap-3">
                                <div className="flex h-8 w-full items-center justify-start gap-1.5">
                                    <Logo className="text-brand size-5" />
                                    <p className="font-clash text-foreground text-lg font-bold tracking-wide">
                                        Chatbot
                                    </p>
                                </div>
                                <p className="text-base font-semibold text-foreground">
                                    Private, Open-Source, and Built for You
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <h3 className="text-sm font-semibold text-foreground">Key benefits:</h3>
                                <div className="flex flex-col items-start gap-2">
                                    {points.map((point, index) => (
                                        <div key={index} className="flex items-start gap-2">
                                            {point.icon}
                                            <ReactMarkdown
                                                className="text-sm"
                                                components={{
                                                    p: ({ children }) => (
                                                        <p className="text-muted-foreground text-sm">
                                                            {children}
                                                        </p>
                                                    ),
                                                    strong: ({ children }) => (
                                                        <span className="text-foreground text-sm font-semibold">
                                                            {children}
                                                        </span>
                                                    ),
                                                }}
                                            >
                                                {point.text}
                                            </ReactMarkdown>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end p-4 border-t border-border bg-muted/20">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
