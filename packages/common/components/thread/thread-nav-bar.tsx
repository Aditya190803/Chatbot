import { useChatStore } from '@repo/common/store';
import { useParams } from 'next/navigation';

export const ThreadNavBar = () => {
    const { threadId: currentThreadId } = useParams();
    const threadTitle = useChatStore(state => {
        if (!currentThreadId) {
            return state.currentThread?.title ?? '';
        }

        if (state.currentThread?.id === currentThreadId) {
            return state.currentThread?.title ?? '';
        }

        const thread = state.threads.find(t => t.id === currentThreadId);
        return thread?.title ?? '';
    });

    return (
        <div className="border-border bg-secondary absolute left-0 right-0 top-0 z-[100] flex h-10 w-full flex-row items-center justify-center border-b">
            <p className="line-clamp-1 max-w-xl text-sm font-medium">{threadTitle}</p>
        </div>
    );
};
