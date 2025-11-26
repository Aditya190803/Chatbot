import { DisableEnter, ShiftEnterToLineBreak } from '@repo/shared/utils';
import CharacterCount from '@tiptap/extension-character-count';
import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import History from '@tiptap/extension-history';
import Highlight from '@tiptap/extension-highlight';
import Paragraph from '@tiptap/extension-paragraph';
import Placeholder from '@tiptap/extension-placeholder';
import Text from '@tiptap/extension-text';

import { Editor, useEditor } from '@tiptap/react';
import { useEffect, useMemo, useRef } from 'react';
import { useChatStore } from '../store';

// Create extensions factory function to ensure fresh instances
const createExtensions = (options: {
    placeholder: string;
    charLimit: number;
    enableEnter: boolean;
}) => {
    const baseExtensions = [
        Document,
        Paragraph,
        Text,
        History.configure({
            depth: 100,
            newGroupDelay: 500,
        }),
        Placeholder.configure({
            placeholder: options.placeholder,
        }),
        CharacterCount.configure({
            limit: options.charLimit,
        }),
        Highlight.configure({
            HTMLAttributes: {
                class: 'prompt-highlight',
            },
        }),
    ];

    return options.enableEnter
        ? [...baseExtensions, HardBreak]
        : [...baseExtensions, ShiftEnterToLineBreak, DisableEnter];
};

export const useChatEditor = (editorProps: {
    placeholder?: string;
    defaultContent?: string;
    charLimit?: number;
    enableEnter?: boolean;
    onInit?: (props: { editor: Editor }) => void;
    onUpdate?: (props: { editor: Editor }) => void;
}) => {
    const setEditor = useChatStore(state => state.setEditor);

    const placeholder = editorProps?.placeholder || 'Ask anything';
    const charLimit = editorProps?.charLimit || 400000;
    const enableEnter = Boolean(editorProps?.enableEnter);
    const defaultContent = editorProps?.defaultContent;

    const onInitRef = useRef(editorProps?.onInit);
    const onUpdateRef = useRef(editorProps?.onUpdate);

    useEffect(() => {
        onInitRef.current = editorProps?.onInit;
    }, [editorProps?.onInit]);

    useEffect(() => {
        onUpdateRef.current = editorProps?.onUpdate;
    }, [editorProps?.onUpdate]);

    const extensions = useMemo(
        () => createExtensions({ placeholder, charLimit, enableEnter }),
        [placeholder, charLimit, enableEnter]
    );

    const editor = useEditor(
        {
            extensions,
            immediatelyRender: false,
            content: '',
            autofocus: true,

            onTransaction(props) {
                const { editor } = props;
                const text = editor.getText();
                const html = editor.getHTML();
                if (text === '/') {
                    // setOpenPromptsBotCombo(true);
                } else {
                    const newHTML = html.replace(/::((?:(?!::).)+)::/g, (_, content) => {
                        return ` <mark class="prompt-highlight">${content}</mark> `;
                    });

                    if (newHTML !== html) {
                        editor.commands.setContent(newHTML, true, {
                            preserveWhitespace: true,
                        });
                    }
                    // setOpenPromptsBotCombo(false);
                }
            },
            onCreate(props) {
                if (defaultContent) {
                    props.editor.commands.setContent(defaultContent || '', true, {
                        preserveWhitespace: true,
                    });
                }
                if (onInitRef.current) {
                    onInitRef.current({ editor: props.editor });
                }
            },
            onUpdate(props) {
                const { editor } = props;
                if (onUpdateRef.current) {
                    onUpdateRef.current({ editor });
                }
            },

            parseOptions: {
                preserveWhitespace: 'full',
            },
        },
        [extensions, defaultContent],
    );

    useEffect(() => {
        setEditor(editor);
        return () => {
            setEditor(null);
        };
    }, [editor, setEditor]);

    useEffect(() => {
        if (editor) {
            editor.commands.focus('end');
        }
    }, [editor]);

    return {
        editor,
    };
};
