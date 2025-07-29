import { Editor, type Monaco } from '@monaco-editor/react';
import { useCallback, useEffect, useState } from 'react';
import type { editor } from 'monaco-editor';
import { KeyCode, KeyMod } from 'monaco-editor';
import type { Language } from '../types/common';
import type { User } from '../../../backend/src/types';

const CUSTOM_THEME: editor.IStandaloneThemeData = {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
        'editor.background': '#1a202c',
        'editor.foreground': '#d1d5db',
        'editorLineNumber.foreground': '#6b7280',
        'editorLineNumber.activeForeground': '#9ca3af',
        'editor.selectionBackground': '#374151',
        'editor.selectionHighlightBackground': '#2d3748',
        'editorCursor.foreground': '#d1d5db',
        'editor.lineHighlightBackground': '#1f2937',
        'editorGutter.background': '#1a202c',
    },
};

const OTHER_USERS_CURSOR_COLORS = [
    'text-purple-400',
    'text-green-400',
    'text-blue-400',
    'text-yellow-400',
    'text-red-400',
    'text-pink-400',
];

const cyrb53hash = (str: string, seed: number = 0) => {
    let h1 = 0xdeadbeef ^ seed,
        h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

function cursorDecorationFromUsers(users: User[]) {
    if (!users || users.length === 0) {
        return [];
    }

    const usersWithCursor = users.filter((u) => !!u.cursor);

    return usersWithCursor.map((user) => ({
        range: {
            startLineNumber: user.cursor!.line,
            startColumn: user.cursor!.column,
            endLineNumber: user.cursor!.line,
            endColumn: user.cursor!.column + 1, // Assuming cursor is a single character
        },
        options: {
            // This className will be used to style the cursor
            // Color is determined by the user's name hash
            className: `remote-cursor ${OTHER_USERS_CURSOR_COLORS[cyrb53hash(user.name) % OTHER_USERS_CURSOR_COLORS.length]}`,
            hoverMessage: [
                {
                    value: user.name,
                },
            ],
        },
    }));
}

interface PadEditorProps {
    code: string;
    language: Language;
    users: User[];
    onCodeChange: (code: string) => void;
    onRunClick: () => void;
    onClearOutput: () => void;
    onCursorChange?: (position: { line: number; column: number }) => void;
}

export function PadEditor({
    code,
    language,
    users,
    onRunClick,
    onClearOutput,
    onCodeChange: onCodeChangeOriginal,
    onCursorChange,
}: PadEditorProps) {
    const [editor, setEditor] = useState<editor.IStandaloneCodeEditor | undefined>(undefined);

    // Handle Monaco editor theme setup
    const handleEditorDidMount = useCallback(
        (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
            setEditor(editor);

            // Define custom theme
            monaco.editor.defineTheme('coderjam-dark', CUSTOM_THEME);
            monaco.editor.setTheme('coderjam-dark');

            // Add cursor position change listener
            if (onCursorChange) {
                editor.onDidChangeCursorPosition((e) => {
                    onCursorChange({
                        line: e.position.lineNumber,
                        column: e.position.column,
                    });
                });
            }

            // Add custom actions
            editor.addAction({
                id: 'clear-output',
                label: 'Clear Output',
                run: onClearOutput,
                contextMenuGroupId: 'navigation',
                contextMenuOrder: 1,
            });
            editor.addAction({
                id: 'run-code',
                label: 'Run Code',
                keybindings: [KeyMod.CtrlCmd | KeyCode.Enter],
                run: onRunClick,
                contextMenuGroupId: 'navigation',
                contextMenuOrder: 2,
            });
        },
        [onCursorChange, onClearOutput, onRunClick]
    );

    useEffect(() => {
        if (!editor) {
            console.warn('Editor not mounted yet, skipping decoration setup');
            return;
        }
        // Apply example decorations
        const createdDecs = editor.createDecorationsCollection(cursorDecorationFromUsers(users));

        return () => createdDecs.clear();
    }, [editor, users]);

    const onCodeChange = useCallback(
        (newValue: string | undefined) => {
            if (newValue !== undefined) {
                onCodeChangeOriginal(newValue);
            }
        },
        [onCodeChangeOriginal]
    );

    return (
        <Editor
            onMount={handleEditorDidMount}
            theme="coderjam-dark"
            language={language}
            value={code}
            onChange={onCodeChange}
            options={{
                automaticLayout: true,
                fontSize: 14,
                lineHeight: 20,
                fontFamily: 'JetBrains Mono, Monaco, Cascadia Code, monospace',
                scrollbar: {
                    vertical: 'auto',
                    alwaysConsumeMouseWheel: false,
                },
                scrollBeyondLastLine: false,
                minimap: { enabled: false },
                lineNumbers: 'on',
                renderLineHighlight: 'gutter',
                selectOnLineNumbers: true,
                roundedSelection: false,
                cursorStyle: 'line',
                cursorWidth: 2,
                wordWrap: 'off',
            }}
        />
    );
}
