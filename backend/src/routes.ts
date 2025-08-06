import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createPad } from './padService.js';
import { logger, logServerError } from './logger.js';
import { capturePadEvent } from './sentry.js';
import { isDevelopment, NODE_ENV, VITE_DEV_SERVER } from './common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupRoutes(app: express.Application): void {
    // Health check endpoint for load balancers
    app.get('/api/health', (_req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: NODE_ENV,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.env.APP_VERSION || 'unknown',
        });
    });

    // Readiness probe - more comprehensive health check
    app.get('/api/ready', async (_req, res) => {
        try {
            // Add any database connectivity checks here if needed
            res.json({
                status: 'ready',
                timestamp: new Date().toISOString(),
                checks: {
                    server: 'ok',
                }
            });
        } catch (error) {
            logger.error('Readiness check failed:', error);
            res.status(503).json({
                status: 'not ready',
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    // -------------- API routes --------------

    // Create a new pad
    app.post('/api/pad', async (req, res) => {
        try {
            const { id, key } = await createPad();
            logger.info('Pad created', {
                padId: id,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                component: 'pad-service'
            });
            
            // Track pad creation in Sentry
            capturePadEvent('created', id, {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            res.json({
                id,
                key,
            });
        } catch (error) {
            logServerError(error instanceof Error ? error : new Error(String(error)), {
                event: 'create-pad',
                ip: req.ip,
                component: 'pad-service'
            });
            res.status(500).json({ error: 'Failed to create pad' });
        }
    });

    // Catch-all for unmatched API routes
    app.use('/api', (req, res) => {
        res.status(404).json({ error: 'API endpoint not found' });
    });

    if (isDevelopment) {
        // Development: Proxy all non-API requests to Vite dev server
        console.log(`Proxying frontend requests to: ${VITE_DEV_SERVER}`);

        const viteProxy = createProxyMiddleware({
            target: VITE_DEV_SERVER,
            changeOrigin: true,
            ws: true, // Enable WebSocket proxying for HMR
            logger: null, // Use console for logging
            on: {
                error: (err) => {
                    console.log('Vite proxy error:', err.message);
                    console.log('Make sure Vite dev server is running on', VITE_DEV_SERVER);
                },
            },
        });

        // "express.static" alternative in development, proxies all non-API routes to Vite
        app.use('/', (req, res, next) => {
            // Skip API routes
            if (req.path.startsWith('/api')) {
                return next();
            }
            return viteProxy(req, res, next);
        });
    } else {
        // Production: Serve static files from React build
        const frontendDistPath = path.join(__dirname, '../../public');
        app.use(express.static(frontendDistPath));

        // Handle React Router routes
        app.get('*', (_req, res) => {
            res.sendFile(path.join(frontendDistPath, 'index.html'));
        });
    }
}
