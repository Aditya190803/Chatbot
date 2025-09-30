'use server';

import { auth } from '@repo/common/auth/server';

export const submitFeedback = async (feedback: string) => {
    const session = await auth();
    const userId = session?.userId;

    if (!userId) {
        return { error: 'Unauthorized' };
    }

    return feedback;
};
