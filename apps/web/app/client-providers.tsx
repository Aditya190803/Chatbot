'use client';

import { RootLayout } from '@repo/common/components';
import { AuthProvider, ReactQueryProvider, RootProvider } from '@repo/common/context';
import { TooltipProvider } from '@repo/ui';

export default function ClientProviders({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <TooltipProvider>
            <AuthProvider>
                <ReactQueryProvider>
                    <RootProvider>
                        <RootLayout>{children}</RootLayout>
                    </RootProvider>
                </ReactQueryProvider>
            </AuthProvider>
        </TooltipProvider>
    );
}
