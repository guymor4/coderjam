export interface User {
    id: string;
    name: string;
    cursor?: {
        line: number;
        column: number;
    };
}

export interface PadRoom {
    padId: string;
    users: User[];
    code: string;
    language: string;
    output: OutputEntry[];
    isRunning: boolean;
}

// Update of a pad state, received from the client
export interface PadStateUpdate {
    padId: string;
    code?: string;
    language?: string;
    cursor?: { line: number; column: number };
    isRunning?: boolean;
    output?: OutputEntry[];
}

export interface PadStateUpdated extends PadRoom {}

// Represents a pad in the DB
export interface PadDB {
    id: string;
    language: string;
    code: string;
    created_at: Date;
    updated_at: Date;
}

export type OutputEntry = {
    text: string;
    type: 'log' | 'error';
};