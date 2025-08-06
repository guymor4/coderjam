import * as Sentry from '@sentry/node';
import { logger } from './logger.js';
import { isDevelopment, SENTRY_DSN } from './common.js';

// Initialize Sentry only if DSN is provided and not in development
export function initSentry(): void {
    if (isDevelopment) {
        logger.info('Sentry is disabled in development mode.');
        return;
    }
    if (!SENTRY_DSN) {
        logger.error('SENTRY_DSN env variable is not set. Sentry will not be initialized.');
        return;
    }

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
            if (
                event.request?.url?.includes('/api/health') ||
                event.request?.url?.includes('/api/ready')
            ) {
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

// Export Sentry for direct use
export { Sentry };
