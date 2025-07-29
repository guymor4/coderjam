import type { CreatePadResponse, ApiError } from '../types/api';

async function doRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint;

    const config: RequestInit = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
        const error = data as ApiError;
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return data;
}

// Create a new pad
export async function createPad(): Promise<CreatePadResponse> {
    return doRequest<CreatePadResponse>('/api/pad', {
        method: 'POST',
    });
}

// Get pad by ID
// export async function getPad(id: string): Promise<Pad> {
//     return doRequest<Pad>(`/api/pad/${id}`);
// }

// // Update pad
// export async function updatePad(id: string, language: string, code: string): Promise<Pad> {
//     return doRequest<Pad>(`/api/pad/${id}`, {
//         method: 'PUT',
//         body: JSON.stringify({ language, code }),
//     });
// }
