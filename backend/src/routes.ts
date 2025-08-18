import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createPad } from './padService.js';
import { logger, logServerError } from './logger.js';
import { isDevelopment, NODE_ENV, validatePadId, VITE_DEV_SERVER } from './common.js';

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
            res.json({
                status: 'ready',
                timestamp: new Date().toISOString(),
                checks: {
                    server: 'ok',
                },
            });
        } catch (error) {
            logger.error('Readiness check failed:', error);
            res.status(503).json({
                status: 'not ready',
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error',
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
                component: 'pad-service',
            });

            res.json({
                id,
                key,
            });
        } catch (error) {
            logServerError(error instanceof Error ? error : new Error(String(error)), {
                event: 'create-pad',
                ip: req.ip,
                component: 'pad-service',
            });
            res.status(500).json({ error: 'Failed to create pad' });
        }
    });

    // Catch-all for unmatched API routes
    app.use('/api', (req, res) => {
        res.status(404).json({ error: 'API endpoint not found' });
    });

    // -------------- Session cookie middleware for pad routes --------------
    // Set session cookie for pad routes to enable sticky sessions
    app.use('/p/:padId', (req, res, next) => {
        const padId = req.params.padId;
        if (padId && validatePadId(padId)) {
            // Set session cookie with pad ID for nginx consistent hashing
            res.cookie('pad_session', padId, {
                httpOnly: true,
                secure: !isDevelopment, // Only secure in production
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
            });
        }
        next();
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
        // Production: Serve static files from public directory
        const publicPath = path.join(__dirname, '../../public'); // that's the public directory *in the docker* (/app/public)
        app.use(express.static(publicPath));

        // Handle React Router routes (but not files with extensions)
        app.get('*', (req, res) => {
            // Don't serve index.html for files with extensions
            if (path.extname(req.path)) {
                res.status(404).send('File not found');
                return;
            }

            res.sendFile(path.join(publicPath, 'index.html'));
        });
    }
}
