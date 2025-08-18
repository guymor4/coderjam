export const NODE_ENV: string = process.env.NODE_ENV || 'development';
export const isDevelopment: boolean = NODE_ENV !== 'production';
export const VITE_DEV_SERVER = process.env.VITE_DEV_SERVER || 'http://localhost:5173';
export const SENTRY_DSN = process.env.SENTRY_DSN;

export function validatePadId(padId: string): boolean {
    return /^[a-zA-Z0-9]{6}$/.test(padId);
}