import express from 'express';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createPad } from './padService';

export function setupRoutes(app: express.Application): void {
    const VITE_DEV_SERVER = process.env.VITE_DEV_SERVER || 'http://localhost:5173';
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // Health check endpoint
    app.get('/api/health', (_req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            viteProxy: isDevelopment ? VITE_DEV_SERVER : 'disabled',
        });
    });

    // -------------- API routes --------------

    // Create a new pad
    app.post('/api/pad', async (_req, res) => {
        try {
            const newPadId = await createPad();
            res.json({
                id: newPadId,
            });
        } catch (error) {
            console.error('Error creating pad:', error);
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
