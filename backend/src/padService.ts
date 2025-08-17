import { getLanguageCodeSample, Language, OutputEntry } from 'coderjam-shared';
import db from './database.js';
import { PadDB, PadStored } from './types.js';
import {QueryResult} from "pg";
import { logServerError } from './logger.js';

const DEFAULT_LANGUAGE: Language= 'javascript';

// Creates a new pad ID short 6 digits long
// May collide, check for existing pads
function generatePadId(): string {
    return Math.random().toString(36).substring(2, 8);
}

// Generates a cryptographically secure random key for pad access
function generatePadKey(): string {
    // Generate 32 random bytes and encode as base64
    const randomBytes = new Uint8Array(32);
    for (let i = 0; i < randomBytes.length; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
    }
    return Buffer.from(randomBytes).toString('base64url');
}

export async function createPad(): Promise<{ id: string; key: string }> {
    let id = generatePadId();
    let count = 0;
    // Check if pad with this ID already exists
    while ((await getPad(id)) !== undefined) {
        id = generatePadId();
        count++;
        if (count > 100) {
            throw new Error('Failed to generate a unique pad ID after 100 attempts');
        }
    }

    const key = generatePadKey();
    const codeSample = getLanguageCodeSample(DEFAULT_LANGUAGE);
    await db.query('INSERT INTO pads (id, key, language, code) VALUES ($1, $2, $3, $4) RETURNING *', [
        id,
        key,
        DEFAULT_LANGUAGE,
        codeSample,
    ]);

    return { id, key };
}

export async function getPad(id: string): Promise<PadStored | undefined> {
    const result: QueryResult<PadDB> = await db.query('SELECT * FROM pads WHERE id = $1', [id]);
    if (result.rowCount === 0 || result.rows.length === 0 || !result.rows[0]) {
        return undefined; // Pad not found
    }

    const padDB = result.rows[0];

    var output: OutputEntry[] = [];
    try {
        output = JSON.parse(padDB.output || '[]') as OutputEntry[];
    } catch (error) {
        // Log and ignore
        logServerError(error instanceof Error ? error : new Error(String(error)), {
            event: 'get-pad',
            padId: padDB.id,
        })
    }

    return {
        padId: padDB.id,
        code: padDB.code,
        language: padDB.language,
        output: output,
    }
}

export async function verifyPadKey(id: string, key: string): Promise<boolean> {
    const result: QueryResult<{ key: string }> = await db.query('SELECT key FROM pads WHERE id = $1', [id]);
    if (result.rowCount === 0 || result.rows.length === 0 || !result.rows[0]) {
        return false; // Pad not found
    }
    
    const pad = result.rows[0];
    return pad.key === key;
}

export async function updatePad(id: string, language: string, code: string, output: OutputEntry[]): Promise<PadDB | undefined> {
    const outputStr = JSON.stringify(output);

    const result = await db.query(
        'UPDATE pads SET language = $2, code = $3, output = $4 WHERE id = $1 RETURNING *',
        [id, language, code, outputStr]
    );
    if (result.rowCount === 0) {
        return undefined; // Pad not found
    }
    return result.rows[0] ?? undefined;
}