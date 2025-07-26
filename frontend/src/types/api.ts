export interface Pad {
    id: string;
    language: string;
    code: string;
    created_at: string;
    updated_at: string;
}

export interface CreatePadResponse {
    id: string;
}

export interface ApiError {
    error: string;
}

export interface HealthResponse {
    status: string;
    timestamp: string;
    environment: string;
    viteProxy: string;
}
