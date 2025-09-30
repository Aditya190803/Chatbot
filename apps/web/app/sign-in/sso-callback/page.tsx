"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuthActions } from '@repo/common/context';

export default function Page() {
    const router = useRouter();
    const { completeOAuthSession } = useAuthActions();
    const [status, setStatus] = useState<'processing' | 'error'>('processing');

    useEffect(() => {
        const finishOAuth = async () => {
            try {
                await completeOAuthSession();
                router.replace('/chat');
            } catch (error) {
                console.error('OAuth completion error:', error);
                setStatus('error');
                router.replace('/sign-in?error=oauth_failed');
            }
        };

        void finishOAuth();
    }, [completeOAuthSession, router]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <p className="text-muted-foreground text-sm">
                {status === 'processing' ? 'Completing sign-in...' : 'Redirecting...'}
            </p>
        </div>
    );
}
