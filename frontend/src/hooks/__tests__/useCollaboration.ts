import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { io, Socket } from 'socket.io-client';
import { useCollaboration, type useCollaborationCallbacks } from '../useCollaboration';
import type { PadStateUpdate, PadStateUpdated, UserRenamed } from 'coderjam-shared';

// Mock Socket.IO
vi.mock('socket.io-client', () => ({
    io: vi.fn(),
}));

describe('useCollaboration', () => {
    let mockSocket: Partial<Socket>;
    let mockCallbacks: useCollaborationCallbacks;

    beforeEach(() => {
        // Create a mock socket instance
        mockSocket = {
            id: 'test-socket-id',
            connected: false,
            on: vi.fn(),
            off: vi.fn(),
            emit: vi.fn(),
            disconnect: vi.fn(),
        };
        // Mock io function to return our mock socket
        vi.mocked(io).mockReturnValue(mockSocket as Socket);

        // Setup default callbacks
        mockCallbacks = {
            onPadStateUpdated: vi.fn(),
            onUserRenamed: vi.fn(),
            onError: vi.fn(),
        };

        // Clear all mocks before each test
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('setup and connection events', () => {
        it('should initialize with default state', () => {
            const { result } = renderHook(() => useCollaboration());

            expect(result.current.isConnected).toBe(false);
            expect(result.current.error).toBe(null);
            expect(result.current.userId).toBeUndefined();
        });

        it('should handle connect event', () => {
            const { result } = renderHook(() => useCollaboration());

            // Simulate connect event
            // @ts-expect-error manual mocking of socket event
            const connectHandler = mockSocket.on.mock.calls.find(
                (call: unknown[]) => call[0] === 'connect'
            )[1];
            act(() => {
                connectHandler();
            });

            expect(result.current.isConnected).toBe(true);
            expect(result.current.error).toBe(null);
            expect(result.current.userId).toBe('test-socket-id');
        });

        it('should handle disconnect event', () => {
            const { result } = renderHook(() => useCollaboration());

            // First connect
            // @ts-expect-error manual mocking of socket event
            const connectHandler = mockSocket.on.mock.calls.find(
                (call: unknown[]) => call[0] === 'connect'
            )[1];
            act(() => {
                connectHandler();
            });

            // Then disconnect
            // @ts-expect-error manual mocking of socket event
            const disconnectHandler = mockSocket.on.mock.calls.find(
                (call: unknown[]) => call[0] === 'disconnect'
            )[1];

            expect(result.current.isConnected).toBe(true);
            act(() => {
                disconnectHandler();
            });
            expect(result.current.isConnected).toBe(false);
        });

        it('should handle error event', () => {
            const { result } = renderHook(() => useCollaboration(mockCallbacks));

            // @ts-expect-error manual mocking of socket event
            const errorHandler = mockSocket.on.mock.calls.find(
                (call: unknown[]) => call[0] === 'error'
            )[1];
            const errorData = { message: 'Connection failed' };

            act(() => {
                errorHandler(errorData);
            });

            expect(result.current.error).toBe('Connection failed');
            expect(mockCallbacks.onError).toHaveBeenCalledWith('Connection failed');
        });

        it('should handle error event with fallback message', () => {
            const { result } = renderHook(() => useCollaboration(mockCallbacks));

            // @ts-expect-error manual mocking of socket event
            const errorHandler = mockSocket.on.mock.calls.find(
                (call: unknown[]) => call[0] === 'error'
            )[1];
            const errorData = {};

            act(() => {
                errorHandler(errorData);
            });

            expect(result.current.error).toBe('Unknown socket error');
            expect(mockCallbacks.onError).toHaveBeenCalledWith('Unknown socket error');
        });
    });

    describe('socket event callbacks', () => {
        it('should call onPadStateUpdated callback', () => {
            renderHook(() => useCollaboration(mockCallbacks));

            // @ts-expect-error manual mocking of socket event
            const padStateHandler = mockSocket.on.mock.calls.find(
                (call: unknown[]) => call[0] === 'pad_state_updated'
            )[1];
            const padStateData: PadStateUpdated = {
                padId: 'test-pad',
                users: [],
                code: 'console.log("test")',
                language: 'javascript',
                output: [],
                isRunning: false,
                ownerId: 'user-1',
            };

            act(() => {
                padStateHandler(padStateData);
            });

            expect(mockCallbacks.onPadStateUpdated).toHaveBeenCalledWith(padStateData);
        });

        it('should call onUserRenamed callback', () => {
            renderHook(() => useCollaboration(mockCallbacks));

            // @ts-expect-error manual mocking of socket event
            const userRenamedHandler = mockSocket.on.mock.calls.find(
                (call: unknown[]) => call[0] === 'user_renamed'
            )[1];
            const userRenamedData: UserRenamed = {
                padId: 'test-pad',
                userId: 'user-1',
                newName: 'New Name',
            };

            act(() => {
                userRenamedHandler(userRenamedData);
            });

            expect(mockCallbacks.onUserRenamed).toHaveBeenCalledWith(userRenamedData);
        });
    });

    describe('joinPad', () => {
        it('should join pad when connected', async () => {
            const { result } = renderHook(() => useCollaboration());

            // Simulate connection
            // @ts-expect-error manual mocking of socket event
            const connectHandler = mockSocket.on.mock.calls.find(
                (call: unknown[]) => call[0] === 'connect'
            )[1];
            act(() => {
                connectHandler();
            });

            await act(async () => {
                await result.current.joinPad('test-pad', 'test-user');
            });
            expect(mockSocket.emit).toHaveBeenCalledWith('join_pad', {
                padId: 'test-pad',
                userName: 'test-user',
            });
            expect(result.current.error).toBe(null);
        });

        it('should not join pad when not connected', async () => {
            const { result } = renderHook(() => useCollaboration());

            await act(async () => {
                await result.current.joinPad('test-pad', 'test-user');
            });

            expect(mockSocket.emit).not.toHaveBeenCalled();
            expect(result.current.error).toBe('Not connected to server');
        });

        it('should handle join pad errors', async () => {
            const { result } = renderHook(() => useCollaboration());

            // Simulate connection
            // @ts-expect-error manual mocking of socket event
            const connectHandler = mockSocket.on.mock.calls.find(
                (call: unknown[]) => call[0] === 'connect'
            )[1];
            act(() => {
                connectHandler();
            });

            // Mock socket.emit to throw an error
            // @ts-expect-error manual mocking of socket event
            mockSocket.emit.mockImplementationOnce(() => {
                throw new Error('Emit failed');
            });

            await act(async () => {
                await result.current.joinPad('test-pad', 'test-user');
            });

            expect(result.current.error).toBe('Emit failed');
        });
    });

    describe('sendPadStateUpdate', () => {
        it('should send pad state update when connected', () => {
            const { result } = renderHook(() => useCollaboration());

            // Simulate connection
            // @ts-expect-error manual mocking of socket event
            const connectHandler = mockSocket.on.mock.calls.find(
                (call: unknown[]) => call[0] === 'connect'
            )[1];
            act(() => {
                connectHandler();
            });

            const updateData: PadStateUpdate = {
                padId: 'test-pad',
                code: 'console.log("updated")',
                language: 'javascript',
            };

            act(() => {
                result.current.sendPadStateUpdate(updateData);
            });

            expect(mockSocket.emit).toHaveBeenCalledWith('pad_state_update', updateData);
        });

        it('should not send update when not connected', () => {
            const { result } = renderHook(() => useCollaboration());

            const updateData: PadStateUpdate = {
                padId: 'test-pad',
                code: 'console.log("updated")',
            };

            act(() => {
                result.current.sendPadStateUpdate(updateData);
            });

            expect(mockSocket.emit).not.toHaveBeenCalled();
        });
    });

    describe('cleanup', () => {
        it('should cleanup socket on unmount', () => {
            const { unmount } = renderHook(() => useCollaboration());

            // Set socket as connected before unmount
            mockSocket.connected = true;
            unmount();

            expect(mockSocket.off).toHaveBeenCalled();
            expect(mockSocket.disconnect).toHaveBeenCalled();
        });

        it('should not disconnect if socket is not connected', () => {
            const { unmount } = renderHook(() => useCollaboration());

            mockSocket.connected = false;
            unmount();

            expect(mockSocket.off).toHaveBeenCalled();
            expect(mockSocket.disconnect).not.toHaveBeenCalled();
        });
    });
});
