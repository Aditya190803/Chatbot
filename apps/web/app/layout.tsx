import { GeistMono } from 'geist/font/mono';
import type { Viewport } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import localFont from 'next/font/local';
import ClientProviders from './client-providers';

import './globals.css';

const bricolage = Bricolage_Grotesque({
    subsets: ['latin'],
    variable: '--font-bricolage',
});

// Avoid importing client-only utilities in a Server Component.
// Use a tiny local join helper for className composition.
const joinClass = (...inputs: Array<string | false | null | undefined>) =>
    inputs.filter(Boolean).join(' ');

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
            className={joinClass(GeistMono.variable, inter.variable, clash.variable, bricolage.variable)}
            suppressHydrationWarning
        >
            <head>
                <link rel="icon" href="/icon.svg" type="image/svg+xml" />
                <link rel="icon" href="/favicon.ico" sizes="32x32" />
            </head>
            <body>
                <ClientProviders>{children}</ClientProviders>
            </body>
        </html>
    );
}