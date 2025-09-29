import { ClerkProvider } from '@clerk/nextjs';
import { RootLayout } from '@repo/common/components';
import { ReactQueryProvider, RootProvider } from '@repo/common/context';
import { TooltipProvider, cn } from '@repo/ui';
import { GeistMono } from 'geist/font/mono';
import type { Viewport } from 'next';
import { Metadata } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import localFont from 'next/font/local';

const bricolage = Bricolage_Grotesque({
    subsets: ['latin'],
    variable: '--font-bricolage',
});

import './globals.css';

export const metadata: Metadata = {
    title: 'Chatbot - Go Deeper with AI-Powered Research & Agentic Workflows',
    description:
        'Experience deep, AI-powered research with agentic workflows and a wide variety of models for advanced productivity.',
    keywords: 'AI chat, LLM, language models, privacy, minimal UI, ollama, chatgpt',
    authors: [{ name: 'Trendy design', url: 'https://trendy.design' }],
    creator: 'Trendy design',
    publisher: 'Trendy design',
    openGraph: {
        title: 'Chatbot - Go Deeper with AI-Powered Research & Agentic Workflows',
        siteName: 'chatbot.adityamer.live',
        description:
            'Experience deep, AI-powered research with agentic workflows and a wide variety of models for advanced productivity.',
        url: 'https://chatbot.adityamer.live',
        type: 'website',
        locale: 'en_US',
        images: [
            {
                url: 'https://chatbot.adityamer.live/og-image.jpg',
                width: 1200,
                height: 630,
                alt: 'Chatbot Preview',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Chatbot - Go Deeper with AI-Powered Research & Agentic Workflows',
        site: 'chatbot.adityamer.live',
        creator: '@chatbot_live',
        description:
            'Experience deep, AI-powered research with agentic workflows and a wide variety of models for advanced productivity.',
        images: ['https://chatbot.adityamer.live/twitter-image.jpg'],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    alternates: {
        canonical: 'https://chatbot.adityamer.live',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

const inter = localFont({
    src: './InterVariable.woff2',
    variable: '--font-inter',
});

const clash = localFont({
    src: './ClashGrotesk-Variable.woff2',
    variable: '--font-clash',
});

export default function ParentLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={cn(GeistMono.variable, inter.variable, clash.variable, bricolage.variable)}
            suppressHydrationWarning
        >
            <head>
                <link rel="icon" href="/icon.svg" type="image/svg+xml" />
                <link rel="icon" href="/favicon.ico" sizes="32x32" />

                {/* <script
                    crossOrigin="anonymous"
                    src="//unpkg.com/react-scan/dist/auto.global.js"
                ></script> */}
            </head>
            <body>
                {/* <PostHogProvider> */}
                <ClerkProvider>
                    <RootProvider>
                        {/* <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          > */}
                        <TooltipProvider>
                            <ReactQueryProvider>
                                <RootLayout>{children}</RootLayout>
                            </ReactQueryProvider>
                        </TooltipProvider>
                        {/* </ThemeProvider> */}
                    </RootProvider>
                </ClerkProvider>
                {/* </PostHogProvider> */}
            </body>
        </html>
    );
}
