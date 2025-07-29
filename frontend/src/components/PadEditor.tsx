import { Editor, type Monaco } from '@monaco-editor/react';
import { useCallback, useRef } from 'react';
import type { editor } from 'monaco-editor';
import { KeyCode, KeyMod } from 'monaco-editor';
import type { Language } from '../types/common';

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

interface PadEditorProps {
    code: string;
    language: Language;
    onCodeChange: (code: string) => void;
    onRunClick: () => void;
    onClearOutput: () => void;
    onCursorChange?: (position: { line: number; column: number }) => void;
}

export function PadEditor({
    code,
    language,
    onRunClick,
    onClearOutput,
    onCodeChange: onCodeChangeOriginal,
    onCursorChange,
}: PadEditorProps) {
    const editorRef = useRef<editor.IStandaloneCodeEditor>(null);

    // Handle Monaco editor theme setup
    const handleEditorDidMount = useCallback(
        (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
            editorRef.current = editor;

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
        [onClearOutput, onRunClick, onCursorChange]
    );

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
