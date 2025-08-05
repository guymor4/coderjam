import * as Sentry from '@sentry/node';
import { logger } from './logger';
import { isDevelopment, SENTRY_DSN } from './common';

// Initialize Sentry only if DSN is provided and not in development
export function initSentry(): void {
    if (!SENTRY_DSN) {
        logger.error("SENTRY_DSN env variable is not set. Sentry will not be initialized.");
        return;
    }

    // if (!SENTRY_DSN || isDevelopment) {
    //     return;
    // }

    Sentry.init({
        dsn: SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.APP_VERSION || 'unknown',
        tracesSampleRate: 0.1, // Capture 10% of transactions for performance monitoring
        enableLogs: true,
        beforeSendLog: (log) => {
            // Filter out HTTP component logs to avoid spamming Sentry
            if (log.attributes?.['component'] === 'http') {
                return null;
            }
            return log;
        },
        
        // Filter out health check requests from error reporting
        beforeSend(event) {
            // Don't report health check errors
            if (event.request?.url?.includes('/api/health') || event.request?.url?.includes('/api/ready')) {
                return null;
            }
            return event;
        },
        
        // Set custom tags
        initialScope: {
            tags: {
                component: 'backend',
                service: 'coderjam',
            },
        },
    });
}

// Helper function to capture custom events
export const captureCodeExecution = (language: string, success: boolean, duration?: number, error?: string) => {
    Sentry.addBreadcrumb({
        category: 'code-execution',
        message: `Code execution: ${language}`,
        level: success ? 'info' : 'error',
        data: {
            language,
            success,
            duration,
            error,
        },
    });
    
    if (!success && error) {
        Sentry.captureMessage(`Code execution failed for ${language}: ${error}`, 'error');
    }
};

export const captureCollaborationEvent = (event: string, data: any = {}) => {
    Sentry.addBreadcrumb({
        category: 'collaboration',
        message: `Collaboration: ${event}`,
        level: 'info',
        data,
    });
};

export const capturePadEvent = (event: string, padId: string, data: any = {}) => {
    Sentry.addBreadcrumb({
        category: 'pad',
        message: `Pad ${event}: ${padId}`,
        level: 'info',
        data: {
            padId,
            ...data,
        },
    });
};

// Export Sentry for direct use
export { Sentry };