import { Language } from './languages';

export type OutputEntry = {
    text: string;
    type: 'log' | 'error';
};

export type RunResult = {
    output: OutputEntry[];
};

export interface User {
    id: string;
    name: string;
    cursor?: {
        line: number;
        column: number;
        // Optional selection start position
        // if defined, the cursor line and column are the end of the selection
        selectionStart?: {
            line: number;
            column: number
        }
    };
}

export interface PadRoom {
    padId: string;
    users: User[];
    code: string;
    language: Language;
    output: OutputEntry[];
    isRunning: boolean;
    ownerId?: string; // User ID of the pad owner who executes code
}

// Update of a pad state, received from the client
export interface PadStateUpdate {
    padId: string;
    code?: string;
    language?: Language;
    cursor?: User['cursor'];
    isRunning?: boolean;
    output?: OutputEntry[];
}

export type PadStateUpdated = PadRoom;

export interface UserRename {
    padId: string;
    newName: string;
}

export interface UserRenamed {
    padId: string;
    userId: string;
    newName: string;
}

export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}