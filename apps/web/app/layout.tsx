import { RootLayout } from '@repo/common/components';
import { AuthProvider, ReactQueryProvider, RootProvider } from '@repo/common/context';
import { TooltipProvider } from '@repo/ui';
import { GeistMono } from 'geist/font/mono';
import type { Viewport } from 'next';
import { Metadata } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import localFont from 'next/font/local';

import './globals.css';

const bricolage = Bricolage_Grotesque({
    subsets: ['latin'],
    variable: '--font-bricolage',
});

// Avoid importing client-only utilities in a Server Component.
// Use a tiny local join helper for className composition.
const joinClass = (...inputs: Array<string | false | null | undefined>) =>
    inputs.filter(Boolean).join(' ');

// export const metadata: Metadata = {} as any;

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

export const dynamic = 'force-dynamic';

export default function ParentLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={joinClass(GeistMono.variable, inter.variable, clash.variable, bricolage.variable)}
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
                <TooltipProvider>
                    <AuthProvider>
                        <ReactQueryProvider>
                            <RootProvider>
                                <RootLayout>{children}</RootLayout>
                            </RootProvider>
                        </ReactQueryProvider>
                    </AuthProvider>
                </TooltipProvider>
            </body>
        </html>
    );
}