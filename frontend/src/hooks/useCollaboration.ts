import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
    type PadStateUpdate,
    type PadStateUpdated,
    type UserRename,
    type UserRenamed,
} from 'coderjam-shared';

export interface useCollaborationResult {
    // State
    isConnected: boolean;
    error: string | null;
    userId?: string;

    // Actions
    joinPad: (padId: string, userName: string, key: string) => Promise<void>;
    leavePad: () => void;
    sendPadStateUpdate: (data: PadStateUpdate) => void;
    sendRenameUpdate: (data: UserRename) => void;
}

export interface useCollaborationCallbacks {
    onPadStateUpdated: (data: PadStateUpdated) => void;
    onUserRenamed: (data: UserRenamed) => void;
    onError: (error: string) => void;
}

export function useCollaboration(callbacks?: useCollaborationCallbacks): useCollaborationResult {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const currentPadIdRef = useRef<string | null>(null);
    const callbacksRef = useRef<useCollaborationCallbacks | undefined>(callbacks);

    // Update callbacks ref when they change
    useEffect(() => {
        callbacksRef.current = callbacks;
    }, [callbacks]);

    // Initialize socket connection
    useEffect(() => {
        console.log('Initializing socket connection');
        const serverUrl = window.location.origin;

        const socket = io(serverUrl, {
            transports: ['websocket', 'polling'],
            upgrade: true,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to collaboration server', socket.id);
            setIsConnected(true);
            setError(null);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from collaboration server', socket.id);
            setIsConnected(false);
            // setUsers([]);
        });

        socket.on('pad_state_updated', (data: PadStateUpdated) => {
            callbacksRef.current?.onPadStateUpdated(data);
        });

        socket.on('user_renamed', (data: UserRenamed) => {
            callbacksRef.current?.onUserRenamed(data);
        });

        socket.on('error', (errorData: { message: string }) => {
            const errorMessage = errorData.message || 'Unknown socket error';
            setError(errorMessage);
            callbacksRef.current?.onError(errorMessage);
        });

        // Cleanup on unmount
        return () => {
            console.log('Cleaning up socket connection');
            socket.off();
            if (socket.connected) {
                socket.disconnect();
            }
            socketRef.current = null;
        };
    }, []);

    const userId = socketRef.current?.id;

    const joinPad = useCallback(
        async (padId: string, userName: string, key: string) => {
            const socket = socketRef.current;

            if (!socket || !isConnected) {
                console.warn('Socket not connected, cannot join pad');
                setError('Not connected to server');
                return;
            }

            try {
                currentPadIdRef.current = padId;
                socket.emit('join_pad', { padId, userName, key });
                setError(null);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to join pad';
                setError(errorMessage);
                console.error('Error joining pad:', err);
            }
        },
        [isConnected]
    );

    const leavePad = useCallback(() => {
        const socket = socketRef.current;

        if (socket && currentPadIdRef.current) {
            // Don't disconnect the socket, just leave the current pad
            currentPadIdRef.current = null;
            setError(null);
        }
    }, []);

    const sendPadStateUpdate = useCallback(
        (data: PadStateUpdate) => {
            const socket = socketRef.current;
            if (!socket || !isConnected) {
                console.warn('Socket not connected, cannot send pad state update');
                return;
            }

            try {
                socket.emit('pad_state_update', data);
                console.log('Sent pad state update:', data);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to send update';
                setError(errorMessage);
                console.error('Error sending pad state update:', err);
            }
        },
        [isConnected]
    );

    const sendRenameUpdate = useCallback(
        (data: UserRename) => {
            const socket = socketRef.current;
            if (!socket || !isConnected) {
                console.warn('Socket not connected, cannot send rename update', socket);
                return;
            }

            try {
                socket.emit('user_rename', data);
                console.log('Sent user rename update:', data);
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : 'Failed to send rename update';
                setError(errorMessage);
                console.error('Error sending user rename update:', err);
            }
        },
        [isConnected]
    );

    return {
        // State
        isConnected,
        error,
        userId,

        // Actions
        joinPad,
        leavePad,
        sendPadStateUpdate,
        sendRenameUpdate,
    };
}
