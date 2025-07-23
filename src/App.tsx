import './App.css';
import { Editor } from '@monaco-editor/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { editor } from 'monaco-editor';
import { RUNNERS, type OutputEntry } from './runners/runner';
import { Button } from './components/Button';
import { Select } from './components/Select';

const INITIAL_OUTPUT: OutputEntry[] = [
    { type: 'log', text: 'Code execution results will be displayed here.' },
];
const CLEAN_OUTPUT: OutputEntry[] = [{ type: 'log', text: 'Output cleared.' }];
const INITIAL_LANGUAGE: Language = 'javascript';
const SUPPORTED_LANGUAGES: Language[] = Object.keys(RUNNERS);

type Language = keyof typeof RUNNERS;

function App() {
    const editorRef = useRef<editor.IStandaloneCodeEditor>(null);
    const [output, setOutput] = useState<OutputEntry[]>(INITIAL_OUTPUT);
    const [language, setLanguage] = useState<Language>(INITIAL_LANGUAGE);
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
            editorRef.current?.setValue(currentRunner.codeSample);
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
            const code = editorRef.current.getValue();
            const newOutput = await currentRunner.runCode(code);
            setOutput((existingOutput) => [...existingOutput, ...newOutput.output]);
        } finally {
            setIsReady(true);
        }
    }, [currentRunner]);

    const OnClearOutput = useCallback(() => {
        setOutput(CLEAN_OUTPUT);
    }, []);

    return (
        <div className="flex w-screen h-screen bg-gray-100">
            <div className="flex-1 flex flex-col p-4">
                <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3 justify-between flex-1">
                        <Select
                            value={language}
                            onChange={setLanguage}
                            options={SUPPORTED_LANGUAGES.map((lang) => ({
                                value: lang,
                                label: lang,
                            }))}
                        />
                        {isReady ? (
                            <Button colorType="green" onClick={onRunClick}>
                                <svg
                                    className="w-4 h-4 mr-2"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                                Run code
                            </Button>
                        ) : (
                            <Button disabled colorType="default">
                                Running...
                            </Button>
                        )}
                    </div>
                </div>
                <div className="flex-auto grow">
                    <Editor
                        onMount={(editor) => (editorRef.current = editor)}
                        theme="vs-dark"
                        language={language}
                        defaultValue="console.log('Hello World!');"
                        options={{
                            automaticLayout: true,
                            fontSize: 16,
                            lineHeight: 24,
                            scrollbar: {
                                vertical: 'auto',
                                alwaysConsumeMouseWheel: false,
                            },
                            scrollBeyondLastLine: false,
                        }}
                    />
                </div>
            </div>
            <div className="flex-1 flex flex-col gap-2 p-4 pr-0 border-l border-gray-300">
                <div className="flex justify-between pr-2">
                    <h2 className="text-lg font-semibold">Output</h2>
                    <Button variant="outline" onClick={OnClearOutput}>
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
                <div className="p-4 bg-gray-200 text-gray-700 grow overflow-y-auto font-mono">
                    {output?.map((entry) => (
                        <div className={entry.type === 'error' ? 'text-red-700' : 'text-gray-700'}>
                            {entry.text}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default App;
