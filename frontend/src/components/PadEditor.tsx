import { Editor, type Monaco } from '@monaco-editor/react';
import { useCallback, useEffect, useState } from 'react';
import type { editor } from 'monaco-editor';
import { KeyCode, KeyMod } from 'monaco-editor';
import type { Language } from '../types/common';
import type { User } from '../../../backend/src/types';
import { getUserColorClassname } from '../utils/userColors';

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

function cursorDecorationFromUsers(users: User[]) {
    if (!users || users.length === 0) {
        return [];
    }

    const usersWithCursor = users.filter((u) => !!u.cursor);

    const decorations: editor.IModelDeltaDecoration[] = [];
    for (const user of usersWithCursor) {
        if (!user.cursor) {
            console.warn(`User ${user.name} has no cursor defined`);
            continue;
        }

        const colorClassName = getUserColorClassname(user.name);
        const cursorClassName = user.cursor?.selectionStart
            ? 'remote-cursor-selection'
            : 'remote-cursor';

        // Use selectionStart if available, otherwise use cursor position
        const startLine = user.cursor.selectionStart?.line ?? user.cursor.line;
        const startColumn = user.cursor.selectionStart?.column ?? user.cursor.column;

        decorations.push({
            range: {
                endLineNumber: user.cursor.line,
                endColumn: user.cursor.column,
                startLineNumber: startLine,
                startColumn: startColumn,
            },
            options: {
                // This className will be used to style the cursor
                // Color is determined by the user's name hash
                className: `${cursorClassName} ${colorClassName}`,
                hoverMessage: [
                    {
                        value: user.name,
                    },
                ],
                // shouldFillLineOnLineBreak: true,
            },
        });
    }
    return decorations;
}

interface PadEditorProps {
    code: string;
    language: Language;
    users: User[];
    onCodeChange: (code: string) => void;
    onRunClick: () => void;
    onClearOutput: () => void;
    onCursorChange?: (newCursor: User['cursor']) => void;
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

    const handleCursorChange = useCallback(
        (e: editor.ICursorSelectionChangedEvent) => {
            if (!onCursorChange) {
                return;
            }

            const isSelection =
                e.selection.startLineNumber !== e.selection.endLineNumber ||
                e.selection.startColumn !== e.selection.endColumn;

            onCursorChange({
                line: e.selection.endLineNumber,
                column: e.selection.endColumn,
                selectionStart: isSelection
                    ? {
                          line: e.selection.startLineNumber,
                          column: e.selection.startColumn,
                      }
                    : undefined,
            });
        },
        [onCursorChange]
    );

    // Handle Monaco editor theme setup
    const handleEditorDidMount = useCallback(
        (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
            setEditor(editor);

            // Define custom theme
            monaco.editor.defineTheme('coderjam-dark', CUSTOM_THEME);
            monaco.editor.setTheme('coderjam-dark');

            // This will be called when the selection changes AND when the cursor position changes
            editor.onDidChangeCursorSelection(handleCursorChange);

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
        [handleCursorChange, onClearOutput, onRunClick]
    );

    useEffect(() => {
        if (!editor) {
            return;
        }

        console.log('users changed', users);
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
