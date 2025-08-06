import winston from 'winston';
import { isDevelopment } from './common.js';
import * as Sentry from '@sentry/node';
import Transport from 'winston-transport';

// Custom format for development
const developmentFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const blacklist = ['service', 'version', 'environment', 'port', 'component'];
        for (const key of blacklist) {
            delete meta[key];
        }
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
    })
);

// JSON format for production
const productionFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const SentryWinstonTransport = Sentry.createSentryWinstonTransport(Transport);


// Create logger instance
export const logger = winston.createLogger({
    level: isDevelopment ? 'debug' : 'info',
    format: isDevelopment ? developmentFormat : productionFormat,
    defaultMeta: {
        service: 'coderjam-backend',
        version: process.env.APP_VERSION || 'unknown',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [
        new winston.transports.Console({
            handleExceptions: true,
            handleRejections: true
        }),
        new SentryWinstonTransport(),
    ],
    // Exit on handled exceptions in production
    exitOnError: !isDevelopment
});

// Add file transports in production
if (!isDevelopment) {
    logger.add(new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        handleExceptions: true,
        handleRejections: true,
        maxsize: 15728640, // 15MB
        maxFiles: 5
    }));
    logger.add(new winston.transports.File({
        filename: 'logs/combined.log',
        level: 'debug',
        handleExceptions: true,
        handleRejections: true,
        maxsize: 15728640, // 15MB
        maxFiles: 5
    }));
}

export const collabLogger = logger.child({ component: 'collaboration' });

// Create a stream for Morgan HTTP logging
export const morganStream = {
    write: (message: string): void => {
        logger.info(message.trim(), { component: 'http' });
    }
};

export const logServerError = (error: Error, context: any = {}) => {
    logger.error('Server Error', {
        message: error.message,
        stack: error.stack,
        ...context,
        component: 'error'
    });
};