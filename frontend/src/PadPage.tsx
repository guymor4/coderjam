import { Navigate, useParams } from 'react-router-dom';
import { PadEditor } from './components/PadEditor';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RUNNERS } from './runners/runner';
import { Select } from './components/Select';
import { Button } from './components/Button';
import { TabLayout } from './components/TabLayout';
import { SideBySideLayout } from './components/SideBySideLayout';
import { CollaborationBalloon, CollaborationToggle } from './components/CollaborationBalloon';
import { useCollaboration } from './hooks/useCollaboration';
import {
    BAD_KEY_ERROR,
    capitalize,
    getLanguageCodeSample,
    isValidLanguage,
    type OutputEntry,
    type PadRoom,
    SUPPORTED_LANGUAGES,
} from 'coderjam-shared';
import { getUserColorClassname } from './utils/userColors';
import { useLocalStorageState } from './hooks/useLocalStorageState';
import useIsOnMobile from './hooks/useIsOnMobile';

const INITIAL_OUTPUT: OutputEntry[] = [
    { type: 'log', text: 'Code execution results will be displayed here.' },
];
const CLEAN_OUTPUT: OutputEntry[] = [{ type: 'log', text: 'Output cleared.' }];

export function PadPage() {
    const { padId } = useParams<{ padId: string }>();
    const searchParams = new URLSearchParams(window.location.search);
    const key = searchParams.get('key');
    const [isLoading] = useState<boolean>(false);
    const [initializingRunning, setInitializingRunning] = useState<boolean>(false);
    const [error, setError] = useState<string | undefined>(undefined);
    // pad is the current state of the pad, including code, language, output, etc.
    // pad.users contains the list of users currently in the pad INCLUDING the current user
    // pad.ownerId is the user ID of the owner who executes the code
    // pad.isRunning indicates if the code is currently running AND whether the owner should execute it
    const [pad, setPad] = useState<PadRoom | undefined>(undefined);
    const [username, setUsername] = useLocalStorageState<string>('username', 'Guest');
    const [isCoderGradient, setIsCoderGradient] = useState<boolean>(true);
    const [isCollaborationVisible, setIsCollaborationVisible] = useState<boolean>(false);
    const currentRunner = pad ? RUNNERS[pad.language] : undefined;
    const isOnMobile = useIsOnMobile();

    // Setup collaboration hook
    const { isConnected, userId, joinPad, leavePad, sendPadStateUpdate, sendRenameUpdate } =
        useCollaboration({
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
                setError(error);
            },
            onUserRenamed: (data) => {
                console.log('Received user renamed:', data, pad?.users);
                setPad((prevPad) => {
                    if (!prevPad) return prevPad;
                    const updatedUsers = prevPad.users.map((user) =>
                        user.id === data.userId ? { ...user, name: data.newName } : user
                    );
                    return { ...prevPad, users: updatedUsers };
                });
            },
        });

    // Join pad room when padId changes
    useEffect(() => {
        if (!padId || !isConnected || !key) {
            return;
        }

        joinPad(padId, username, key);
        return () => leavePad();

        // `username` should not be a dependency here
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [padId, key, isConnected, joinPad, leavePad]);

    const usersWithoutMe = useMemo(() => {
        if (!pad) return [];
        return pad.users.filter((user) => user.id !== userId);
    }, [pad, userId]);

    // Replace output in the pad state and send update to the server
    // TODO This function should not exists, we should never override written output (this restarts the output on every load)
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
            if (pad?.padId) {
                sendPadStateUpdate({
                    padId: pad.padId,
                    output: newOutput,
                });
            }
        },
        [pad?.padId, sendPadStateUpdate]
    );

    const isOwner = useMemo(() => {
        if (pad?.ownerId === undefined || !userId) {
            return false;
        }
        return pad.ownerId === userId;
    }, [pad?.ownerId, userId]);

    useEffect(() => {
        if (!currentRunner || !isOwner) {
            return;
        }

        const initRunner = async () => {
            // should be overridden
            let initOutput: OutputEntry[] = [{ type: 'log', text: 'No output from runner init' }];
            try {
                console.log('Running running run...');
                setInitializingRunning(true);
                changeOutput([
                    {
                        type: 'log',
                        text: `Loading ${pad?.language} environment...`,
                    },
                ]);
                const result = await currentRunner.init();
                initOutput = result.output;
            } finally {
                changeOutput(initOutput);
                setInitializingRunning(false);
            }
        };

        initRunner();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [changeOutput, currentRunner, isOwner]); // no language dependency here only currentRunner and isOwner

    // Owner watches for isRunning changes and automatically executes code
    useEffect(() => {
        if (!isOwner || !currentRunner || !pad?.isRunning) {
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

    // Set isRunning to true and so signal the owner to run the code
    const signalRunCode = useCallback(async () => {
        if (!pad?.padId) {
            return;
        }

        // Switch to output tab on mobile when running code
        // setActiveTab('output');

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
    }, [pad?.padId, sendPadStateUpdate]);

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

    if (!key || error === BAD_KEY_ERROR.message) {
        return (
            <div className="flex w-screen h-screen bg-dark-950 text-dark-100 items-center justify-center">
                <div className="text-lg text-red-400">
                    Access denied: Invalid or missing pad key
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex w-screen h-screen bg-dark-950 text-dark-100 items-center justify-center">
                <div className="text-lg text-red-400">Error: {error}</div>
            </div>
        );
    }

    if (isLoading || !pad) {
        return (
            <div className="flex w-screen h-screen bg-dark-950 text-dark-100 items-center justify-center">
                <div className="text-lg" data-testid="loading-pad">
                    Loading pad...
                </div>
            </div>
        );
    }

    const LayoutComponent = isOnMobile ? TabLayout : SideBySideLayout;

    return (
        <div
            className="flex flex-col w-screen h-screen bg-dark-950 text-dark-100"
            data-testid="pad-loaded"
        >
            {/* Header - responsive */}
            <div className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-dark-800 border-b border-dark-600">
                <div className="flex items-center gap-1 md:gap-2 mb-2 md:mb-0">
                    <h1
                        className="text-xl md:text-2xl font-semibold"
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
                    <a
                        href="https://github.com/guymor4/coderjam"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center p-2 text-dark-300 hover:text-dark-100 hover:bg-dark-700 rounded transition-colors duration-200"
                        title="View source on GitHub"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </a>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                    <Select
                        value={pad.language || 'javascript'}
                        onChange={changeLanguage}
                        className="capitalize text-sm"
                        data-testid="language-selector"
                        disabled={initializingRunning || pad.isRunning}
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
                    {initializingRunning || pad.isRunning ? (
                        <Button disabled colorType="default" className="text-sm">
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
                            <span className="hidden sm:inline">Running...</span>
                            <span className="sm:hidden">Run</span>
                        </Button>
                    ) : (
                        <Button colorType="green" onClick={signalRunCode} className="text-sm">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                            <span className="hidden sm:inline">Run Code</span>
                            <span className="sm:hidden">Run</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 flex overflow-hidden">
                {/* SideBySide for Desktop and Tabs for Mobile */}
                <LayoutComponent
                    codeContent={
                        <div className="h-full bg-dark-800">
                            <PadEditor
                                code={pad.code || ''}
                                language={pad.language}
                                users={usersWithoutMe}
                                onCodeChange={changeCode}
                                onRunClick={signalRunCode}
                                onClearOutput={clearOutput}
                                onCursorChange={(newCursor) => {
                                    if (pad) {
                                        sendPadStateUpdate({
                                            padId: pad.padId,
                                            cursor: newCursor,
                                        });
                                    }
                                }}
                                readOnly={!isConnected}
                                readonlyOptions={{
                                    message: 'You are not connected to the pad',
                                    className: 'grayscale',
                                }}
                            />
                        </div>
                    }
                    outputContent={
                        <div className="flex flex-col h-full bg-dark-800">
                            {!isOnMobile && (
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
                            )}
                            <div
                                data-testid="output"
                                className="flex-1 p-4 bg-dark-900 overflow-y-auto font-mono text-sm"
                            >
                                {(pad.output ?? INITIAL_OUTPUT)?.map((entry, index) => (
                                    <div
                                        key={index}
                                        className={`mb-1 ${
                                            entry.type === 'error'
                                                ? 'text-red-400'
                                                : 'text-dark-100'
                                        }`}
                                    >
                                        {entry.text}
                                    </div>
                                ))}
                            </div>
                        </div>
                    }
                />
            </div>

            {/* Desktop Footer */}
            <div className="hidden md:flex grow-0 items-center justify-between px-6 py-3 bg-dark-800 border-t border-dark-600">
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
                                +{usersWithoutMe.length - 10}
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

            {/* Mobile: Collaboration balloon and toggle */}
            <CollaborationToggle
                userCount={usersWithoutMe.length}
                isConnected={isConnected}
                onClick={() => setIsCollaborationVisible(true)}
            />
            <CollaborationBalloon
                isVisible={isCollaborationVisible}
                onClose={() => setIsCollaborationVisible(false)}
                userCount={usersWithoutMe.length}
            >
                <>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="flex gap-1 flex-wrap">
                            {usersWithoutMe.length === 0 && (
                                <div className="text-sm text-gray-400">Just you here</div>
                            )}
                            {usersWithoutMe.slice(0, 10).map((user) => (
                                <div
                                    className="flex items-center gap-2 bg-dark-700 px-2 py-1 rounded"
                                    key={user.id}
                                >
                                    <div
                                        className={`w-2 h-2 rounded-full flex items-center justify-center bg-current ${getUserColorClassname(user.name)}`}
                                    ></div>
                                    <span className="text-sm text-dark-200">
                                        {user.name} {user.id === pad?.ownerId ? '👑' : ''}
                                    </span>
                                </div>
                            ))}
                            {usersWithoutMe.length > 10 && (
                                <div className="w-6 h-6 rounded-full bg-dark-600 flex items-center justify-center text-xs text-dark-300">
                                    +{usersWithoutMe.length - 10}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2">
                            <label htmlFor="username-mobile" className="text-sm text-dark-300">
                                Username:
                            </label>
                            <input
                                id="username-mobile"
                                type="text"
                                value={username}
                                onChange={(e) => handleUsernameChange(e.target.value)}
                                className="px-3 py-2 text-sm bg-dark-600 border border-dark-500 rounded text-dark-50 focus:outline-none focus:border-blue-400"
                                placeholder="Guest"
                                maxLength={20}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <div
                                className={`w-3 h-3 rounded-full ${
                                    isConnected ? 'bg-green-400' : 'bg-red-400'
                                }`}
                            />
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
                </>
            </CollaborationBalloon>
        </div>
    );
}
