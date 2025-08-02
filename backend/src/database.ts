import { Pool } from 'pg';

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'coderjam',
    password: process.env.DB_PASSWORD || 'coderjam123',
    database: process.env.DB_NAME || 'coderjam',
});

export const query = pool.query;
