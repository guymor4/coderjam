import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Socket.IO client
vi.mock('socket.io-client', () => ({
    io: vi.fn(),
}));

// Mock window.location
Object.defineProperty(window, 'location', {
    value: {
        origin: 'http://localhost:3000',
    },
    writable: true,
});
