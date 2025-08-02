import { getLanguageCodeSample, Language, OutputEntry } from 'coderjam-shared';
import db from './database';
import { PadDB, PadStored } from './types';
import {QueryResult} from "pg";

const DEFAULT_LANGUAGE: Language= 'javascript';

// Creates a new pad ID short 6 digits long
// May collide, check for existing pads
function generatePadId(): string {
    return Math.random().toString(36).substring(2, 8);
}

export async function createPad(): Promise<string> {
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

    await db.query('INSERT INTO pads (id, language, code) VALUES ($1, $2, $3) RETURNING *', [
        id,
        DEFAULT_LANGUAGE,
        getLanguageCodeSample(DEFAULT_LANGUAGE),
    ]);

    return id;
}

export async function getPad(id: string): Promise<PadStored | undefined> {
    const result: QueryResult<PadDB> = await db.query('SELECT * FROM pads WHERE id = $1', [id]);
    if (result.rowCount === 0 || result.rows.length === 0 || !result.rows[0]) {
        return undefined; // Pad not found
    }

    const padDB = result.rows[0];
    console.warn(padDB.output)

    var output: OutputEntry[] = [];
    try {
        output = JSON.parse(padDB.output ?? '[]') as OutputEntry[];
    } catch (error) {
        console.error('Failed to parse pad output:', error);
    }

    return {
        padId: padDB.id,
        code: padDB.code,
        language: padDB.language,
        output: output,
    }
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