'use client';

import { CustomSignUp } from '@repo/common/components';
import { useAuth } from '@repo/common/context';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
    const { isSignedIn, isLoaded } = useAuth();
    const router = useRouter();

    if (!isLoaded) return null;

    if (isSignedIn) {
        router.push('/chat');
        return null;
    }

    return (
        <div className="bg-secondary/95 fixed inset-0 z-[100] flex h-full w-full flex-col items-center justify-center gap-2 backdrop-blur-sm">
            <CustomSignUp
                onClose={() => {
                    router.push('/chat');
                }}
            />
        </div>
    );
}