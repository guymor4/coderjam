import { Navigate, useParams } from 'react-router-dom';
import { PadEditor } from './PadEditor';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RUNNERS } from '../runners/runner';
import { Button } from './Button';
import { TabLayout } from './TabLayout';
import { SideBySideLayout } from './SideBySideLayout';
import { CollaborationBalloon, CollaborationToggle } from './CollaborationBalloon';
import { useCollaboration } from '../hooks/useCollaboration';
import {
    BAD_KEY_ERROR,
    getLanguageCodeSample,
    isValidLanguage,
    type OutputEntry,
    type PadRoom,
    SUPPORTED_LANGUAGES,
} from 'coderjam-shared';
import { getUserColorClassname } from '../utils/userColors';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import useIsOnMobile from '../hooks/useIsOnMobile';
import { Header } from './Header';
import { Tooltip } from './Tooltip';

const INITIAL_OUTPUT: OutputEntry[] = [
    { type: 'log', text: 'Code execution results will be displayed here.' },
];
// Output entries that will be set when clearing output
const CLEAN_OUTPUT: OutputEntry[] = [];

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
    const [isCollaborationVisible, setIsCollaborationVisible] = useState<boolean>(false);
    const [autoScrolling, setAutoScrolling] = useLocalStorageState<boolean>('auto_scrolling', true);
    // Ref to track if the next scroll to bottom event should be ignored
    // We want the autoscrolling to enable/disable when the user scrolls but we don't want to trigger it when we auto scroll
    const ignoreNextScrollEvent = useRef<boolean>(false);
    const [outputContainer, setOutputContainer] = useState<HTMLDivElement | null>(null);
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

    // Auto-scroll to bottom when output changes and stick to bottom is enabled
    useEffect(() => {
        if (autoScrolling && outputContainer && !isScrolledToBottom(outputContainer)) {
            ignoreNextScrollEvent.current = true;
            outputContainer.scroll({
                top: outputContainer.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [pad?.output, autoScrolling, outputContainer]);

    // Enable / disable auto-scrolling when the user scrolls
    const handleOutputScroll = useCallback(
        (ev: Event) => {
            const target = ev.target as HTMLElement;
            const isAtBottom = isScrolledToBottom(target);
            console.log('Output scroll event');

            // exit early if should ignore scroll event
            // if we are at the bottom, the scroll event is done and we should not longer ignore scroll events
            if (ignoreNextScrollEvent.current) {
                if (isAtBottom) {
                    // Done scrolling, reset ignore flag
                    console.log('Done scrolling, resetting ignore flag');
                    ignoreNextScrollEvent.current = false;
                }
                console.log('Ignoring scroll event');
                return;
            }

            console.log('Setting auto-scrolling to:', isAtBottom);
            setAutoScrolling(isAtBottom);
        },
        [setAutoScrolling]
    );

    useEffect(() => {
        if (!outputContainer) {
            console.error('No output container found');
            return;
        }

        console.log('Output container found:', outputContainer);

        outputContainer.addEventListener('scroll', handleOutputScroll);
        return () => {
            outputContainer.removeEventListener('scroll', handleOutputScroll);
        };
    }, [handleOutputScroll, outputContainer]);

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
            {/* On mobile show the header above the tabs */}
            {isOnMobile && (
                <Header
                    language={pad.language}
                    onLanguageChange={changeLanguage}
                    isRunning={pad.isRunning || initializingRunning}
                    onRunCode={signalRunCode}
                />
            )}
            {/* Main content area */}
            <div className="flex-1 flex overflow-hidden">
                {/* SideBySide for Desktop and Tabs for Mobile */}
                <LayoutComponent
                    codeContent={
                        <div className="h-full bg-dark-800">
                            {/* On desktop show the header inside the code panel */}
                            {!isOnMobile && (
                                <Header
                                    language={pad.language}
                                    onLanguageChange={changeLanguage}
                                    isRunning={pad.isRunning || initializingRunning}
                                    onRunCode={signalRunCode}
                                />
                            )}
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
                                    <div className="flex gap-2">
                                        <Tooltip
                                            text={
                                                autoScrolling
                                                    ? 'Auto-scrolling is enabled'
                                                    : 'Auto-scrolling is disabled'
                                            }
                                            delay={200}
                                            direction="bottom"
                                        >
                                            <Button
                                                variant={autoScrolling ? 'default' : 'outline'}
                                                onClick={() => setAutoScrolling(!autoScrolling)}
                                            >
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 12l-7 7m0 0l-7-7m7 7V3"
                                                    />
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M5 23h14"
                                                    />
                                                </svg>
                                            </Button>
                                        </Tooltip>
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
                                </div>
                            )}
                            <div
                                ref={(ref) => setOutputContainer(ref)}
                                data-testid="output"
                                className="flex-1 p-4 bg-dark-900 overflow-y-auto font-mono text-sm"
                            >
                                {(pad.output ?? INITIAL_OUTPUT)?.map((entry, index) => (
                                    // <pre> for preserving line breaks and spacing
                                    <pre
                                        key={index}
                                        className={`mb-1 ${
                                            entry.type === 'error'
                                                ? 'text-red-400'
                                                : 'text-dark-100'
                                        }`}
                                    >
                                        {entry.text}
                                    </pre>
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
                                    {user.name} {user.id === pad?.ownerId ? '(Code executor)' : ''}
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
                    <Tooltip
                        text={
                            isOwner
                                ? 'You are the code executor of this pad'
                                : isConnected
                                  ? 'You are connected to the server'
                                  : 'You are not connected to the server'
                        }
                    >
                        <span className="text-sm text-dark-300">
                            {isConnected ? 'Connected' : 'Disconnected'}
                            {isOwner && isConnected && ' (Code executor)'}
                        </span>
                    </Tooltip>
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
function isScrolledToBottom(target: HTMLElement) {
    const scrollTop = target.scrollTop;
    const scrollTopMax = target.scrollHeight - target.clientHeight;
    return scrollTop === scrollTopMax;
}
