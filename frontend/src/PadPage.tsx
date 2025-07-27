import { Navigate, useParams } from 'react-router-dom';
import { PadEditor } from './components/PadEditor';
import { useCallback, useEffect, useState } from 'react';
import { type OutputEntry, RUNNERS } from './runners/runner';
import { Select } from './components/Select';
import { Button } from './components/Button';
import { useCollaboration } from './hooks/useCollaboration';
import { capitalize, type PadState, SUPPORTED_LANGUAGES } from './types/common';

const INITIAL_OUTPUT: OutputEntry[] = [
    { type: 'log', text: 'Code execution results will be displayed here.' },
];
const CLEAN_OUTPUT: OutputEntry[] = [{ type: 'log', text: 'Output cleared.' }];

export function PadPage() {
    const { padId } = useParams<{ padId: string }>();
    const [isLoading] = useState<boolean>(false);
    const [error] = useState<Error | undefined>(undefined);
    const [pad, setPad] = useState<PadState | undefined>(undefined);
    const currentRunner = pad ? RUNNERS[pad.language] : undefined;
    const [isReady, setIsReady] = useState<boolean>(false);
    const [output, setOutput] = useState<OutputEntry[]>(INITIAL_OUTPUT);

    // Setup collaboration hook
    const collaboration = useCollaboration({
        onUserJoined: (user) => {
            console.log('User joined via hook:', user);
        },
        onUserLeft: (user) => {
            console.log('User left via hook:', user);
        },
        onPadStateUpdated: (data) => {
            console.log('Received pad state via hook:', data);
            setPad(data);
        },
        onError: (error) => {
            console.error('Collaboration error:', error);
        },
    });

    // Join pad room when padId changes
    useEffect(() => {
        if (!padId || !collaboration.isConnected) {
            return;
        }

        collaboration.joinPad(padId, 'User');
        return () => collaboration.leavePad();
    }, [padId, collaboration.isConnected, collaboration]);

    // Handle runner initialization on language change
    useEffect(() => {
        if (!currentRunner) {
            return;
        }
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
        if (!currentRunner || !pad) {
            return;
        }

        try {
            setIsReady(false);
            const newOutput = await currentRunner.runCode(pad.code);
            setOutput((existingOutput) => [...existingOutput, ...newOutput.output]);
        } finally {
            setIsReady(true);
        }
    }, [currentRunner, pad]);

    const handleCodeChange = useCallback(
        (newCode: string) => {
            if (!pad) {
                return;
            }

            collaboration.sendPadStateUpdate({
                padId: pad.padId,
                code: newCode,
            });
            setPad((prevPad) =>
                prevPad
                    ? {
                          ...prevPad,
                          code: newCode,
                      }
                    : undefined
            );
        },
        [collaboration, pad]
    );

    const handleLanguageChange = useCallback(
        (newLanguage: string) => {
            if (!pad) {
                return;
            }

            collaboration.sendPadStateUpdate({
                padId: pad.padId,
                language: newLanguage,
                code: RUNNERS[newLanguage]?.codeSample || '',
            });
            setPad((prevPad) =>
                prevPad
                    ? {
                          ...prevPad,
                          language: newLanguage,
                          code: RUNNERS[newLanguage]?.codeSample || '',
                      }
                    : undefined
            );
        },
        [collaboration, pad]
    );

    const onClearOutput = useCallback(() => {
        setOutput(CLEAN_OUTPUT);
    }, []);

    if (!padId) {
        return <Navigate to="/" />;
    }

    if (isLoading || !pad) {
        return (
            <div className="flex w-screen h-screen bg-dark-950 text-dark-100 items-center justify-center">
                <div className="text-lg">Loading pad...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex w-screen h-screen bg-dark-950 text-dark-100 items-center justify-center">
                <div className="text-lg text-red-400">
                    Error: {error.name}: {error.message}
                </div>
            </div>
        );
    }

    if (collaboration.error) {
        return (
            <div className="flex w-screen h-screen bg-dark-950 text-dark-100 items-center justify-center">
                <div className="text-lg text-red-400">
                    Collaboration Error: {collaboration.error}
                </div>
            </div>
        );
    }

    return (
        <div className="flex w-screen h-screen bg-dark-950 text-dark-100">
            <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 bg-dark-800 border-b border-dark-600">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-semibold text-dark-50">CoderJam</h1>
                        <div className="text-sm text-dark-300">{padId}</div>
                        {collaboration.users.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-dark-300">
                                    {collaboration.users.length} collaborator
                                    {collaboration.users.length > 1 ? 's' : ''}
                                </span>
                                <div className="flex gap-1">
                                    {collaboration.users.slice(0, 3).map((user) => (
                                        <div
                                            key={user.id}
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white bg-blue-500"
                                            title={user.name}
                                        >
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                    ))}
                                    {collaboration.users.length > 3 && (
                                        <div className="w-6 h-6 rounded-full bg-dark-600 flex items-center justify-center text-xs text-dark-300">
                                            +{collaboration.users.length - 3}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <Select
                            value={pad.language || 'javascript'}
                            onChange={handleLanguageChange}
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
                    <PadEditor
                        code={pad.code || ''}
                        language={pad.language || 'javascript'}
                        onCodeChange={handleCodeChange}
                        onRunClick={onRunClick}
                        onClearOutput={onClearOutput}
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
