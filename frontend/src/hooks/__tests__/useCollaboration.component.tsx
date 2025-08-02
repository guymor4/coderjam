import { useEffect, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { io } from 'socket.io-client';
import { useCollaboration } from '../useCollaboration';
import type { PadStateUpdated } from 'coderjam-shared';

// Mock Socket.IO at the top level
const mockSocket = {
    id: 'component-test-socket',
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
    io: vi.fn(() => mockSocket),
}));

// Test component that uses the hook
function TestCollaborationComponent() {
    const [padState, setPadState] = useState<PadStateUpdated | undefined>(undefined);
    const [userName, setUserName] = useState('');

    const { isConnected, error, userId, joinPad, leavePad, sendPadStateUpdate, sendRenameUpdate } =
        useCollaboration({
            onPadStateUpdated: (data) => {
                setPadState(data);
            },
            onUserRenamed: (data) => {
                console.log('User renamed:', data);
            },
            onError: (error) => {
                console.error('Collaboration error:', error);
            },
        });

    useEffect(() => {
        if (!padState?.padId || !isConnected) {
            return;
        }

        joinPad(padState.padId, userName);
        return () => leavePad();

        // `username` should not be a dependency here
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [padState?.padId, isConnected, joinPad, leavePad]);

    const handleSendCode = () =>
        padState !== undefined &&
        sendPadStateUpdate({
            padId: padState.padId,
            code: padState.code,
        });
    const handleRename = () =>
        padState !== undefined &&
        sendRenameUpdate({
            padId: padState.padId,
            newName: `${userName}_renamed`,
        });

    return (
        <div>
            <div data-testid="connection-status">{isConnected ? 'Connected' : 'Disconnected'}</div>

            <div data-testid="user-id">{userId || 'No user ID'}</div>

            {error && <div data-testid="error">{error}</div>}

            <input
                data-testid="pad-id-input"
                value={padState?.padId}
                onChange={(e) => setPadState((prev) => prev && { ...prev, padId: e.target.value })}
                placeholder="Pad ID"
            />

            <input
                data-testid="username-input"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Username"
            />

            <button data-testid="leave-button" onClick={leavePad}>
                Leave Pad
            </button>

            <input
                data-testid="code-input"
                value={padState?.code ?? ''}
                onChange={(e) => setPadState((prev) => prev && { ...prev, code: e.target.value })}
                placeholder="Code to send"
            />

            <button data-testid="send-code-button" onClick={handleSendCode}>
                Send Code
            </button>

            <button data-testid="rename-button" onClick={handleRename}>
                Rename User
            </button>

            {padState && (
                <div data-testid="pad-state">
                    <div data-testid="pad-code">{padState.code}</div>
                    <div data-testid="pad-language">{padState.language}</div>
                    <div data-testid="pad-users">{padState.users.length} users</div>
                    <div data-testid="pad-owner">{padState.ownerId || 'No owner'}</div>
                </div>
            )}
        </div>
    );
}

describe('useCollaboration in a Component', () => {
    const triggerPadStateUpdated = (data: PadStateUpdated) => {
        // @ts-expect-error manual mocking of socket event
        const padStateHandler = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'pad_state_updated'
        )[1];
        padStateHandler(data);
    };

    // Helper functions to trigger socket events
    const triggerConnect = () => {
        // @ts-expect-error manual mocking of socket event
        const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')[1];
        // Manually set connected state to true because we are mocking the actual functionality
        mockSocket.connected = true;
        connectHandler();

        triggerPadStateUpdated({
            padId: 'test-pad-id',
            users: [],
            code: '',
            language: '',
            output: [],
            isRunning: false,
        });
    };

    const triggerDisconnect = () => {
        // @ts-expect-error manual mocking of socket event
        const disconnectHandler = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'disconnect'
        )[1];
        // Manually set connected state to true because we are mocking the actual functionality
        mockSocket.connected = false;
        disconnectHandler();
    };

    const triggerError = (message: string) => {
        // @ts-expect-error manual mocking of socket event
        const errorHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'error')[1];
        errorHandler({ message });
    };

    beforeEach(() => {
        // Reset all mocks before each test
        vi.clearAllMocks();
        // Reset socket state
        mockSocket.connected = false;
        mockSocket.id = 'component-test-socket';
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should render with initial state', async () => {
        render(<TestCollaborationComponent />);

        // Wait for the component to render and hook to initialize
        await waitFor(() => {
            expect(io).toHaveBeenCalled();
        });

        // Check initial states
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
        expect(screen.getByTestId('user-id')).toHaveTextContent('No user ID');
        expect(screen.queryByTestId('error')).not.toBeInTheDocument();
    });

    it('should handle connection flow', async () => {
        render(<TestCollaborationComponent />);

        // Wait for initial render
        await waitFor(() => {
            expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
        });

        // Simulate connection using helper function
        triggerConnect();

        await waitFor(() => {
            expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
            expect(screen.getByTestId('user-id')).not.toHaveTextContent('No user ID');
        });
    });

    it('should handle receiving pad state updates', async () => {
        render(<TestCollaborationComponent />);

        // Simulate receiving pad state using helper function
        const padState: PadStateUpdated = {
            padId: 'test-pad',
            users: [
                { id: 'user1', name: 'Alice' },
                { id: 'user2', name: 'Bob' },
            ],
            code: 'console.log("Hello World")',
            language: 'javascript',
            output: [],
            isRunning: false,
            ownerId: 'user1',
        };
        triggerPadStateUpdated(padState);

        await waitFor(() => {
            expect(screen.getByTestId('pad-code')).toHaveTextContent('console.log("Hello World")');
            expect(screen.getByTestId('pad-language')).toHaveTextContent('javascript');
            expect(screen.getByTestId('pad-users')).toHaveTextContent('2 users');
            expect(screen.getByTestId('pad-owner')).toHaveTextContent('user1');
        });
    });

    it('should handle sending code updates', async () => {
        render(<TestCollaborationComponent />);

        // Connect first
        triggerConnect();

        fireEvent.change(screen.getByTestId('code-input'), {
            target: { value: 'console.log("Updated code")' },
        });

        // Send code
        fireEvent.click(screen.getByTestId('send-code-button'));

        expect(mockSocket.emit).toHaveBeenCalledWith('pad_state_update', {
            padId: 'test-pad-id',
            code: 'console.log("Updated code")',
        });
    });

    it('should handle user rename', async () => {
        render(<TestCollaborationComponent />);

        // Connect first
        triggerConnect();
        // Simulate receiving initial pad state
        triggerPadStateUpdated({
            padId: 'test-pad',
            users: [],
            code: '',
            language: '',
            output: [],
            isRunning: false,
        });

        // Fill in form data
        fireEvent.change(screen.getByTestId('pad-id-input'), {
            target: { value: 'test-pad' },
        });
        fireEvent.change(screen.getByTestId('username-input'), {
            target: { value: 'OriginalName' },
        });

        // Rename user
        fireEvent.click(screen.getByTestId('rename-button'));

        expect(mockSocket.emit).toHaveBeenCalledWith('user_rename', {
            padId: 'test-pad',
            newName: 'OriginalName_renamed',
        });
    });
    //
    it('should handle errors gracefully', async () => {
        render(<TestCollaborationComponent />);

        // Simulate error using helper function
        triggerError('Connection failed');

        await waitFor(() => {
            expect(screen.getByTestId('error')).toHaveTextContent('Connection failed');
        });
    });

    it('should handle disconnect and reconnect', async () => {
        render(<TestCollaborationComponent />);

        // Initial connection
        triggerConnect();

        await waitFor(() => {
            expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
        });

        // Disconnect
        triggerDisconnect();

        await waitFor(() => {
            expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
        });

        // Reconnect
        triggerConnect();

        await waitFor(() => {
            expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
        });
    });

    it('should handle multiple rapid interactions', async () => {
        render(<TestCollaborationComponent />);

        // Connect first
        triggerConnect();

        // Set up form
        fireEvent.change(screen.getByTestId('pad-id-input'), {
            target: { value: 'rapid-test-pad' },
        });

        // Send multiple rapid code updates
        const codeValues = ['code1', 'code2', 'code3', 'code4', 'code5'];

        for (const code of codeValues) {
            fireEvent.change(screen.getByTestId('code-input'), {
                target: { value: code },
            });
            fireEvent.click(screen.getByTestId('send-code-button'));
        }

        // Should have emitted all updates
        codeValues.forEach((code) => {
            expect(mockSocket.emit).toHaveBeenCalledWith('pad_state_update', {
                padId: 'rapid-test-pad',
                code,
            });
        });
    });
});
