import { useChatStore } from '@repo/common/store';
import { cn, Flex } from '@repo/ui';
import { Editor, EditorContent } from '@tiptap/react';
import { FC, KeyboardEvent } from 'react';

export type TChatEditor = {
    sendMessage?: (message: string) => void;
    editor: Editor | null;
    maxHeight?: string;
    className?: string;
    placeholder?: string;
    sendOnEnter?: boolean;
    isMobile?: boolean;
};

export const ChatEditor: FC<TChatEditor> = ({
    sendMessage,
    editor,
    placeholder,
    maxHeight = '200px',
    className,
    sendOnEnter = true,
    isMobile = false,
}) => {
    const isGenerating = useChatStore(state => state.isGenerating);

    if (!editor) return null;

    const editorContainerClass =
        'no-scrollbar [&>*]:no-scrollbar wysiwyg min-h-[60px] w-full cursor-text overflow-y-auto p-1 text-base outline-none focus:outline-none [&>*]:leading-6 [&>*]:outline-none [&>*]:break-all [&>*]:word-break-break-word [&>*]:whitespace-pre-wrap';

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (isGenerating) return;
        
        // Check if IME composition is in progress (for non-Latin keyboards)
        if (e.nativeEvent?.isComposing) {
            return;
        }
        
        if (e.key === 'Enter') {
            // Mobile behavior: Enter always adds newline, never sends
            if (isMobile) {
                // Let the TipTap HardBreak extension handle newlines
                // Auto-scroll to show the new line
                setTimeout(() => {
                    const element = e.currentTarget;
                    if (element) {
                        element.scrollTop = element.scrollHeight;
                    }
                }, 0);
                return;
            }
            
            // Desktop behavior: Enter sends, Shift+Enter adds newline
            if (e.shiftKey) {
                // Shift+Enter: Let default behavior handle newline, scroll to bottom
                setTimeout(() => {
                    const element = e.currentTarget;
                    if (element) {
                        element.scrollTop = element.scrollHeight;
                    }
                }, 0);
                return;
            }
            
            // Regular Enter on desktop: Send message
            if (sendOnEnter) {
                e.preventDefault();
                sendMessage?.(editor.getText());
            }
        }
    };

    return (
        <Flex className="flex-1">
            <EditorContent
                editor={editor}
                autoFocus
                style={{
                    maxHeight,
                }}
                enterKeyHint={isMobile ? 'enter' : 'send'}
                disabled={isGenerating}
                onKeyDown={handleKeyDown}
                className={cn(editorContainerClass, className)}
            />
        </Flex>
    );
};
