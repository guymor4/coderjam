// Initialize Sentry first (must be imported before other modules)
import { initSentry, Sentry } from './sentry.js';

import express, { Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createServer as createHttpServer } from 'http';
import { setupRoutes } from './routes.js';
import { setupSocketServer } from './collaborationSocketServer.js';
import { logServerError, logger, morganStream } from './logger.js';
import { isDevelopment } from './common';

export function createServer(): Express {
    const app = express();

    // Initialize Sentry
    logger.info('Initializing Sentry');
    initSentry();

    // CORS configuration
    app.use(
        cors({
            origin: isDevelopment
                ? true // Allow all origins in development
                : ['https://coderpad.com', 'https://cloud.umami.is'],
            credentials: true,
    })
    );

    // Logging
    app.use(morgan(isDevelopment ? 'dev' : 'combined', { stream: morganStream }));

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Setup routes
    setupRoutes(app);

    // Add Sentry error handler (must be before other error handlers)
    if (!isDevelopment) {
        app.use(Sentry.expressErrorHandler());
    }

    // Error handling middleware
    app.use(
        (err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
            logServerError(err, {
                url: req.url,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });

            // Capture error in Sentry (in addition to automatic capture)
            if (!isDevelopment) {
                Sentry.withScope((scope) => {
                    scope.setTag('errorHandler', 'express');
                    scope.setContext('request', {
                        url: req.url,
                        method: req.method,
                        ip: req.ip,
                        userAgent: req.get('User-Agent'),
                    });
                    Sentry.captureException(err);
                });
            }

            if (!res.headersSent) {
                res.status(500).json({
                    error: isDevelopment ? err.message : 'Internal server error',
                });
            }
        }
    );

    return app;
}

export function main(): void {
    // Create HTTP server
    const PORT = process.env.PORT || 3001;
    const app = createServer();
    const httpServer = createHttpServer(app);

    // Setup Socket.IO
    setupSocketServer(httpServer);

    // Start server
    httpServer.listen(PORT, () => {
        logger.info('Server started', {
            port: PORT,
            environment: process.env.NODE_ENV || 'development',
            version: process.env.APP_VERSION || 'unknown',
            component: 'startup',
        });
    });
}

main();
