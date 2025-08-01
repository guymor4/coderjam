import { Navigate, useParams } from 'react-router-dom';
import { PadEditor } from './components/PadEditor';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RUNNERS } from './runners/runner';
import { Select } from './components/Select';
import { Button } from './components/Button';
import { useCollaboration } from './hooks/useCollaboration';
import {
    capitalize,
    getLanguageCodeSample,
    isValidLanguage,
    type OutputEntry,
    type PadRoom,
    SUPPORTED_LANGUAGES,
} from 'coderjam-shared';
import { getUserColorClassname } from './utils/userColors';
import { useLocalStorageState } from './hooks/useLocalStorageState';

const INITIAL_OUTPUT: OutputEntry[] = [
    { type: 'log', text: 'Code execution results will be displayed here.' },
];
const CLEAN_OUTPUT: OutputEntry[] = [{ type: 'log', text: 'Output cleared.' }];

export function PadPage() {
    const { padId } = useParams<{ padId: string }>();
    const [isLoading] = useState<boolean>(false);
    const [initializingRunning, setInitializingRunning] = useState<boolean>(false);
    const [error] = useState<Error | undefined>(undefined);
    // pad is the current state of the pad, including code, language, output, etc.
    // pad.users contains the list of users currently in the pad INCLUDING the current user
    const [pad, setPad] = useState<PadRoom | undefined>(undefined);
    const [username, setUsername] = useLocalStorageState<string>('username', 'Guest');
    const [isCoderGradient, setIsCoderGradient] = useState<boolean>(true);
    const currentRunner = pad ? RUNNERS[pad.language] : undefined;

    // Setup collaboration hook
    const {
        isConnected,
        userId,
        joinPad,
        leavePad,
        sendPadStateUpdate,
        sendRenameUpdate,
        error: collaborationError,
    } = useCollaboration({
        onPadStateUpdated: (data) => {
            console.log('Received pad state via hook:', data);
            console.assert(data.users?.length > 0, 'Users field should not be empty');
            console.assert(
                !data.language || isValidLanguage(data.language),
                "Language '" +
                    data.language +
                    "' should be one of: " +
                    SUPPORTED_LANGUAGES.join(', ')
            );
            setPad((prevPad) =>
                prevPad === undefined ? data : Object.assign({ ...prevPad }, data)
            );
        },
        onError: (error) => {
            console.error('Collaboration error:', error);
        },
        onUserRenamed: (data) => {
            console.log('Received user renamed:', data, pad?.users);
            setPad((prevPad) => {
                if (!prevPad) return prevPad;
                const updatedUsers = prevPad.users.map((user) =>
                    user.id === data.userId ? { ...user, name: data.newName } : user
                );
                console.log(updatedUsers);
                return { ...prevPad, users: updatedUsers };
            });
        },
    });

    // Join pad room when padId changes
    useEffect(() => {
        if (!padId || !isConnected) {
            return;
        }

        joinPad(padId, username);
        return () => leavePad();

        // `username` should not be a dependency here
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [padId, isConnected, joinPad, leavePad]);

    const usersWithoutMe = useMemo(() => {
        if (!pad) return [];
        return pad.users.filter((user) => user.id !== userId);
    }, [pad, userId]);

    const changeOutput = useCallback(
        (newOutput: OutputEntry[]) => {
            setPad((prevPad) =>
                prevPad
                    ? {
                          ...prevPad,
                          output: newOutput,
                      }
                    : undefined
            );
            // Send output update if pad is defined
            if (pad) {
                sendPadStateUpdate({
                    padId: pad.padId,
                    output: newOutput,
                });
            }
        },
        [pad, sendPadStateUpdate]
    );

    const isOwner = useMemo(() => {
        if (pad?.ownerId === undefined || !userId) {
            return false;
        }
        return pad.ownerId === userId;
    }, [pad?.ownerId, userId]);

    useEffect(() => {
        if (!currentRunner || !isOwner || currentRunner.isReady()) {
            return;
        }

        console.log('Initializing new runner for language:', pad?.language);
        const initRunner = async () => {
            try {
                setInitializingRunning(true);
                const result = await currentRunner.init();
                if (result) {
                    changeOutput(result.output);
                }
            } finally {
                setInitializingRunning(false);
            }
        };

        initRunner();
    }, [changeOutput, currentRunner, isOwner, pad?.language]);

    // Owner watches for isRunning changes and automatically executes code
    useEffect(() => {
        if (!isOwner || !currentRunner || !pad || !pad.isRunning) {
            return;
        }

        // If we're the owner and isRunning is true, execute the code
        const executeCode = async () => {
            try {
                console.log('Owner executing code automatically...');
                const newOutput = await currentRunner.runCode(pad.code);
                changeOutput([...pad.output, ...newOutput.output]);
            } catch (error) {
                console.error('Error running code as owner:', error);
            } finally {
                // Always set isRunning to false when done
                sendPadStateUpdate({
                    padId: pad.padId,
                    isRunning: false,
                });
                setPad((prevPad) =>
                    prevPad
                        ? {
                              ...prevPad,
                              isRunning: false,
                          }
                        : undefined
                );
            }
        };

        executeCode();
    }, [
        isOwner,
        currentRunner,
        pad?.isRunning,
        pad?.code,
        pad?.padId,
        pad?.output,
        changeOutput,
        sendPadStateUpdate,
    ]);

    const runCode = useCallback(async () => {
        if (!currentRunner || !pad) {
            return;
        }

        // Non-owner just triggers the run by setting isRunning to true
        if (!isOwner) {
            sendPadStateUpdate({
                padId: pad.padId,
                isRunning: true,
            });
            setPad((prevPad) =>
                prevPad
                    ? {
                          ...prevPad,
                          isRunning: true,
                      }
                    : undefined
            );
            return;
        }

        // Owner actually executes the code
        try {
            sendPadStateUpdate({
                padId: pad.padId,
                isRunning: true,
            });
            setPad((prevPad) =>
                prevPad
                    ? {
                          ...prevPad,
                          isRunning: true,
                      }
                    : undefined
            );
            const newOutput = await currentRunner.runCode(pad.code);
            changeOutput([...pad.output, ...newOutput.output]);
        } finally {
            sendPadStateUpdate({
                padId: pad.padId,
                isRunning: false,
            });
            setPad((prevPad) =>
                prevPad
                    ? {
                          ...prevPad,
                          isRunning: false,
                      }
                    : undefined
            );
        }
    }, [currentRunner, changeOutput, pad, sendPadStateUpdate, isOwner]);

    const changeCode = useCallback(
        (newCode: string) => {
            if (!pad) {
                return;
            }

            sendPadStateUpdate({
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
        [sendPadStateUpdate, pad]
    );

    const changeLanguage = useCallback(
        async (newLanguage: string) => {
            if (!pad) {
                return;
            }

            if (!isValidLanguage(newLanguage)) {
                console.error(`Unsupported language: ${newLanguage}`);
                return;
            }

            const codeSample = getLanguageCodeSample(newLanguage);
            console.log('New language', newLanguage + ' with code sample:', codeSample);
            sendPadStateUpdate({
                padId: pad.padId,
                language: newLanguage,
                code: codeSample,
            });
            setPad((prevPad) =>
                prevPad
                    ? {
                          ...prevPad,
                          language: newLanguage,
                          code: codeSample,
                      }
                    : undefined
            );
        },
        [pad, sendPadStateUpdate]
    );

    const clearOutput = useCallback(() => {
        changeOutput(CLEAN_OUTPUT);
    }, [changeOutput]);

    const handleUsernameChange = useCallback(
        (newUsername: string) => {
            if (!pad) {
                return;
            }

            sendRenameUpdate({
                padId: pad.padId,
                newName: newUsername,
            });
            setUsername(newUsername);
        },
        [pad, sendRenameUpdate, setUsername]
    );

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

    if (collaborationError) {
        return (
            <div className="flex w-screen h-screen bg-dark-950 text-dark-100 items-center justify-center">
                <div className="text-lg text-red-400">Collaboration Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-screen h-screen bg-dark-950 text-dark-100">
            <div className="flex grow">
                {/* Left side panel: Pad editor and controls */}
                <div className="flex-1 flex flex-col">
                    <div className="flex grow-0 items-center justify-between px-6 py-4 bg-dark-800 border-b border-dark-600">
                        <div className="flex items-center gap-4">
                            <h1
                                className="text-2xl font-semibold"
                                onMouseLeave={() => setIsCoderGradient(true)}
                            >
                                <span
                                    className={`absolute transition-all duration-300 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent`}
                                >
                                    Coder
                                </span>
                                <span
                                    className={`relative transition-all duration-300 text-dark-50 ${isCoderGradient ? 'opacity-0' : 'opacity-100'}`}
                                    onMouseEnter={() => setIsCoderGradient(false)}
                                >
                                    Coder
                                </span>
                                <span
                                    className={`absolute transition-all duration-300 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent`}
                                >
                                    Jam
                                </span>
                                <span
                                    className={`relative transition-all duration-300 text-dark-50 ${!isCoderGradient ? 'opacity-0' : 'opacity-100'}`}
                                    onMouseEnter={() => setIsCoderGradient(true)}
                                >
                                    Jam
                                </span>
                            </h1>
                            <div className="text-sm text-dark-300">{padId}</div>
                            <Select
                                value={pad.language || 'javascript'}
                                onChange={changeLanguage}
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
                        {initializingRunning || pad.isRunning ? (
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
                        ) : (
                            <Button colorType="green" onClick={runCode}>
                                <svg
                                    className="w-4 h-4 mr-2"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                                Run Code
                            </Button>
                        )}
                    </div>
                    <div className="flex-1 bg-dark-800">
                        <PadEditor
                            code={pad.code || ''}
                            language={pad.language}
                            users={usersWithoutMe}
                            onCodeChange={changeCode}
                            onRunClick={runCode}
                            onClearOutput={clearOutput}
                            onCursorChange={(newCursor) => {
                                if (pad) {
                                    sendPadStateUpdate({
                                        padId: pad.padId,
                                        cursor: newCursor,
                                    });
                                }
                            }}
                        />
                    </div>
                </div>
                {/* Right side panel: Output display */}
                <div className="flex-1 flex flex-col bg-dark-800 border-l border-dark-600">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-dark-600">
                        <h2 className="text-lg font-semibold text-dark-50">Output</h2>
                        <Button variant="outline" onClick={clearOutput}>
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
                        {(pad.output ?? INITIAL_OUTPUT)?.map((entry, index) => (
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
            {/* Footer */}
            <div className="flex grow-0 items-center justify-between px-6 py-3 bg-dark-800 border-t border-dark-600">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                        {usersWithoutMe.length === 0 && (
                            <div className="text-sm text-gray-400">Just you here</div>
                        )}
                        {usersWithoutMe.slice(0, 10).map((user) => (
                            <div className="flex items-center gap-2" key={user.id}>
                                <div
                                    className={`w-2 h-2 rounded-full flex items-center justify-center bg-current ${getUserColorClassname(user.name)}`}
                                ></div>
                                <span className="text-sm text-dark-200">
                                    {user.name} {user.id === pad?.ownerId ? '(Code runner)' : ''}
                                </span>
                            </div>
                        ))}
                        {usersWithoutMe.length > 10 && (
                            <div className="w-6 h-6 rounded-full bg-dark-600 flex items-center justify-center text-xs text-dark-300">
                                +{usersWithoutMe.length - 3}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label htmlFor="username" className="text-sm text-dark-300">
                            Username:
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => handleUsernameChange(e.target.value)}
                            className="px-2 py-1 text-sm bg-dark-600 border border-dark-500 rounded text-dark-50 focus:outline-none focus:border-blue-400"
                            placeholder="Guest"
                            maxLength={20}
                        />
                    </div>
                    <div>
                        <span className="text-sm text-dark-300">
                            {isConnected ? 'Connected' : 'Disconnected'}
                            {isOwner && isConnected && (
                                <span
                                    className="ml-2 text-yellow-400"
                                    title="You are the code executor"
                                >
                                    👑
                                </span>
                            )}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
