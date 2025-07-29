import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { getPad, updatePad } from './padService';
import { PadRoom, PadStateUpdate, PadStateUpdated, User } from './types';

// Pad rooms map: padId -> PadRoom
const padRoomsById = new Map<string, PadRoom>();

export function setupSocketServer(httpServer: HTTPServer) {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: process.env.NODE_ENV !== 'production' ? true : ['https://yourdomain.com'],
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on('join_pad', async (data: { padId: string; userName: string }) => {
            const { padId, userName } = data;

            try {
                // Verify pad exists
                const pad = await getPad(padId);
                if (!pad) {
                    socket.emit('error', { message: 'Pad not found' });
                    return;
                }

                if (socket.rooms.has(padId))
                {
                    // User is already in the pad room
                    console.log(`User ${socket.id} already in pad ${padId}`);
                    return;
                }

                // Join the pad room
                socket.join(padId);

                // Initialize or get pad room
                if (!padRoomsById.has(padId)) {
                    padRoomsById.set(padId, {
                        padId,
                        code: pad.code,
                        language: pad.language,
                        users: [],
                    });
                }
                const room = padRoomsById.get(padId)!;

                const user: User = {
                    id: socket.id,
                    name: userName,
                };

                // Add user to the room
                const existingUser = room.users.find(u => u.id === socket.id);
                if (existingUser) {
                    // User already exists, update name
                    existingUser.name = userName;
                } else {
                    // New user, add to room
                    room.users.push(user);
                }

                // Send the pad state to the joining user only if they are not the creator
                socket.emit('pad_state_updated', {
                    padId,
                    code: pad.code,
                    language: pad.language,
                    users: room.users,
                } as PadStateUpdated);

                console.log(`User ${socket.id} (${userName}) joined pad ${padId}`);
            } catch (error) {
                console.error('Error joining pad:', error);
                socket.emit('error', { message: 'Failed to join pad' });
            }
        });

        socket.on(
            'pad_state_update',
            async ({ padId, code, cursor, language }: PadStateUpdate) => {
                const room = padRoomsById.get(padId);
                if (!room) {
                    console.warn(`Pad room not found for padId: ${padId}`);
                    return;
                }

                const userIndex = room?.users.findIndex(u => u.id === socket.id);
                if (userIndex === -1) {
                    console.warn(`User ${socket.id} not found in pad room ${padId}`);
                    return;
                }

                try {
                    let newUsers: User[] = [ ...room.users ];
                    // Update user cursor position
                    if (cursor) {
                        newUsers[userIndex]!.cursor = cursor;
                    }

                    // Update room state
                    if (code !== undefined) {
                        room.code = code;
                    }
                    if (language !== undefined) {
                        room.language = language;
                    }

                    // Save to database
                    await updatePad(padId, room.language, room.code);

                    // Broadcast to other users in the room
                    socket.to(padId).emit('pad_state_updated', {
                        padId,
                        code,
                        language,
                        users: newUsers,
                    } as PadStateUpdated);
                } catch (error) {
                    console.error('Error handling code change:', error);
                }
            }
        );

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);

            // Remove user from all pad rooms
            for (const [padId, room] of padRoomsById.entries()) {
                const userIndex = room.users.findIndex(u => u.id === socket.id)
                if (userIndex >= 0) {
                    const user = room.users[userIndex]!;
                    // Remove user from the room
                    room.users.splice(userIndex, 1);

                    // Notify other users
                    socket.to(padId).emit('user_left', { userId: socket.id, user });

                    // Clean up empty rooms
                    if (room.users.length === 0) {
                        padRoomsById.delete(padId);
                    }

                    console.log(`User ${socket.id} (${user.name}) left pad ${padId}`);
                }
            }
        });
    });

    return io;
}
