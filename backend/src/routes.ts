import express from 'express';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';

function createNewPad() {
    // Creates a new pad ID short 6 digits long
    const padId = Math.random().toString(36).substring(2, 8);
    console.log(`Created new pad with ID: ${padId}`);
    return padId;
}

export function setupRoutes(app: express.Application) {
    const VITE_DEV_SERVER = process.env.VITE_DEV_SERVER || 'http://localhost:5173';
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // Health check endpoint
    app.get('/api/health', (_req, res) => {
        res.json({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            viteProxy: isDevelopment ? VITE_DEV_SERVER : 'disabled'
        });
    });

    // API routes would go here
    app.use('/api', (req, res) => {
        res.status(404).json({ error: 'API endpoint not found' });
    });

    // Create a new pad for new visit
    app.get('/', (req, res, next) => {
        const newPadId = createNewPad();
        res.redirect(`/p/${newPadId}`);
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
                }
            }
        });

        app.get('/p/:padId', (req, res, next) => {
            const padId = req.params.padId;
            if (!padId) {
                return res.status(400).json({ error: 'Pad ID is required' });
            }

            console.log(`Proxying session ${padId}`);

            // Proxy to Vite dev server with session ID
            return viteProxy(req, res, next);
        });

        // "express.static" alternative in development, proxies all non-API routes to Vite
        app.use('/', (req, res, next) => {
            // Skip API routes
            if (req.path.startsWith('/api') || req.path.startsWith('/p/')) {
                return next();
            }
            return viteProxy(req, res, next);
        });
    } else {
        // Production: Serve static files from React build
        const frontendDistPath = path.join(__dirname, '../../frontend/dist');
        app.use(express.static(frontendDistPath));
        
        // Handle React Router routes
        app.get('*', (_req, res) => {
            res.sendFile(path.join(frontendDistPath, 'index.html'));
        });
    }
}