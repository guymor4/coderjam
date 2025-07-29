import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { PadRoom, PadStateUpdate, PadStateUpdated, User } from '../../../backend/src/types';

export interface CollaborationState {
    isConnected: boolean;
    users: User[];
    error: string | null;
}

export interface CollaborationActions {
    joinPad: (padId: string, userName?: string) => Promise<void>;
    leavePad: () => void;
    sendPadStateUpdate: (data: PadStateUpdate) => void;
}

export interface CollaborationCallbacks {
    onUserLeft?: (user: User) => void;
    onPadStateUpdated?: (data: PadRoom) => void;
    onError?: (error: string) => void;
}

export function useCollaboration(
    callbacks?: CollaborationCallbacks
): CollaborationState & CollaborationActions {
    const [isConnected, setIsConnected] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const currentPadIdRef = useRef<string | null>(null);
    const callbacksRef = useRef<CollaborationCallbacks | undefined>(callbacks);

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
            // Update users from the pad room
            if (data.users) {
                const userList = Array.from(Object.values(data.users));
                setUsers(userList);
            }

            callbacksRef.current?.onPadStateUpdated?.(data);
        });

        socket.on('user_left', (data: { userId: string; user: User }) => {
            setUsers((prev) => prev.filter((u) => u.id !== data.userId));
            callbacksRef.current?.onUserLeft?.(data.user);
        });

        socket.on('error', (errorData: { message: string }) => {
            const errorMessage = errorData.message || 'Unknown socket error';
            setError(errorMessage);
            callbacksRef.current?.onError?.(errorMessage);
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

    const joinPad = useCallback(
        async (padId: string, userName: string = 'Anonymous') => {
            const socket = socketRef.current;

            if (!socket || !isConnected) {
                console.warn('Socket not connected, cannot join pad');
                setError('Not connected to server');
                return;
            }

            try {
                currentPadIdRef.current = padId;
                socket.emit('join_pad', { padId, userName });
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
            setUsers([]);
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

    return {
        // State
        isConnected,
        users,
        error,

        // Actions
        joinPad,
        leavePad,
        sendPadStateUpdate,
    };
}
