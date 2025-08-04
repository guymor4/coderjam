import express, { Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createServer as createHttpServer } from 'http';
import { setupRoutes } from './routes.js';
import { setupSocketServer } from './collaborationSocketServer.js';

export function createServer(): Express {
    const app = express();
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // CORS configuration
    app.use(cors({
        origin: isDevelopment 
            ? true // Allow all origins in development
            : ['https://yourdomain.com'], // Replace with your production domain
        credentials: true,
    }));

    // Logging
    app.use(morgan(isDevelopment ? 'dev' : 'combined'));

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Setup routes
    setupRoutes(app);

    // Error handling middleware
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        console.error('Server error:', err.message);
        if (isDevelopment) {
            console.error(err.stack);
        }
        
        if (!res.headersSent) {
            res.status(500).json({ 
                error: isDevelopment ? err.message : 'Internal server error'
            });
        }
    });

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
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        
        const isDevelopment = process.env.NODE_ENV !== 'production';
        const VITE_DEV_SERVER = process.env.VITE_DEV_SERVER || 'http://localhost:5173';
        
        if (isDevelopment) {
            console.log(`Frontend: http://localhost:${PORT} (proxied to ${VITE_DEV_SERVER})`);
            console.log(`Make sure Vite is running on ${VITE_DEV_SERVER}`);
        }
    });
}

main();
