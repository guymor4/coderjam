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
    language: string;
    output: OutputEntry[];
    isRunning: boolean;
}

// Update of a pad state, received from the client
export interface PadStateUpdate {
    padId: string;
    code?: string;
    language?: string;
    cursor?: User['cursor'];
    isRunning?: boolean;
    output?: OutputEntry[];
}

export interface PadStateUpdated extends PadRoom {}

export interface UserRename {
    padId: string;
    newName: string;
}

export interface UserRenamed {
    padId: string;
    userId: string;
    newName: string;
}

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