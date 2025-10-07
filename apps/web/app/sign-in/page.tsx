'use client';

import { CustomSignIn } from '@repo/common/components';
import { useAuth } from '@repo/common/context';
import { useRouter } from 'next/navigation';

export default function OauthSignIn() {
    const { isSignedIn, isLoaded } = useAuth();
    const router = useRouter();

    if (isSignedIn) {
        router.push('/chat');
    }

    if (!isLoaded) return null;

    return (
        <div className="bg-secondary/95 fixed inset-0 z-[100] flex h-full w-full flex-col items-center justify-center gap-2 backdrop-blur-sm px-4">
            <CustomSignIn
                onClose={() => {
                    router.push('/chat');
                }}
            />
        </div>
    );
}
