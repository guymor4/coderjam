import { Editor, type Monaco } from '@monaco-editor/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { editor } from 'monaco-editor';
import { KeyCode, KeyMod } from 'monaco-editor';
import { type OutputEntry, RUNNERS } from '../runners/runner';
import { Button } from './Button';
import { Select } from './Select';
import { capitalize, type Language, SUPPORTED_LANGUAGES } from '../common';

const INITIAL_OUTPUT: OutputEntry[] = [
    { type: 'log', text: 'Code execution results will be displayed here.' },
];
const CLEAN_OUTPUT: OutputEntry[] = [{ type: 'log', text: 'Output cleared.' }];

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
    padId: string;
    code: string;
    language: Language;
    onCodeChange: (code: string) => void;
    onLanguageChange: (language: Language) => void;
}

export function PadEditor({
    padId,
    code,
    language,
    onLanguageChange,
    onCodeChange: onCodeChangeOriginal,
}: PadEditorProps) {
    const editorRef = useRef<editor.IStandaloneCodeEditor>(null);
    const [output, setOutput] = useState<OutputEntry[]>(INITIAL_OUTPUT);
    const [isReady, setIsReady] = useState<boolean>(false);

    const currentRunner = useMemo(() => RUNNERS[language], [language]);

    // Handle runner initialization on language change
    useEffect(() => {
        const doInit = async () => {
            setIsReady(false);
            const result = await currentRunner.init?.();
            if (result) {
                setOutput(result.output);
            }
            setIsReady(true);
        };

        doInit();
    }, [currentRunner]);

    const onRunClick = useCallback(async () => {
        if (!editorRef.current) {
            return;
        }
        try {
            setIsReady(false);
            const currentCode = editorRef.current.getValue();
            const newOutput = await currentRunner.runCode(currentCode);
            setOutput((existingOutput) => [...existingOutput, ...newOutput.output]);
        } finally {
            setIsReady(true);
        }
    }, [currentRunner]);

    const onClearOutput = useCallback(() => {
        setOutput(CLEAN_OUTPUT);
    }, []);

    // Handle Monaco editor theme setup
    const handleEditorDidMount = useCallback(
        (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
            editorRef.current = editor;

            // Define custom theme
            monaco.editor.defineTheme('coderjam-dark', CUSTOM_THEME);
            monaco.editor.setTheme('coderjam-dark');

            // Add custom actions
            editor.addAction({
                id: 'clear-output',
                label: 'Clear Output',
                run: () => {
                    setOutput(CLEAN_OUTPUT);
                },
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
        [onRunClick]
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
        <div className="flex w-screen h-screen bg-dark-950 text-dark-100">
            <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 bg-dark-800 border-b border-dark-600">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-semibold text-dark-50">CoderJam</h1>
                        <div className="text-sm text-dark-300">{padId}</div>
                        <Select
                            value={language}
                            onChange={onLanguageChange}
                            className="capitalize"
                            options={SUPPORTED_LANGUAGES.map((lang) => ({
                                value: lang,
                                label: capitalize(lang),
                                icon: (
                                    <img
                                        src={`/icons/${lang}.svg`}
                                        alt={`${lang} icon`}
                                        className="w-4 h-4"
                                    />
                                ),
                            }))}
                        />
                    </div>
                    {isReady ? (
                        <Button colorType="green" onClick={onRunClick}>
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                            Run Code
                        </Button>
                    ) : (
                        <Button disabled colorType="default">
                            <svg
                                className="w-4 h-4 mr-2 animate-spin"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                            Running...
                        </Button>
                    )}
                </div>
                <div className="flex-1 bg-dark-800">
                    <Editor
                        key={padId}
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
                </div>
            </div>
            <div className="flex-1 flex flex-col bg-dark-800 border-l border-dark-600">
                <div className="flex items-center justify-between px-6 py-4 border-b border-dark-600">
                    <h2 className="text-lg font-semibold text-dark-50">Output</h2>
                    <Button variant="outline" onClick={onClearOutput}>
                        <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16"
                            />
                        </svg>
                        Clear
                    </Button>
                </div>
                <div className="flex-1 p-4 bg-dark-900 overflow-y-auto font-mono text-sm">
                    {output?.map((entry, index) => (
                        <div
                            key={index}
                            className={`mb-1 ${
                                entry.type === 'error' ? 'text-red-400' : 'text-dark-100'
                            }`}
                        >
                            {entry.text}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
