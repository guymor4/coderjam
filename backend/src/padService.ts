import { query } from './database';

export interface Pad {
    id: string;
    language: string;
    code: string;
    created_at: Date;
    updated_at: Date;
}

const DEFAULT_LANGUAGE = 'javascript';


// Creates a new pad ID short 6 digits long
// May collide, check for existing pads
function generatePadId(): string {
    return Math.random().toString(36).substring(2, 8);
}

export async function createPad(): Promise<string> {
    let id = generatePadId();
    let count = 0;
    // Check if pad with this ID already exists
    while (await getPad(id) !== null) {
        id = generatePadId();
        count++;
        if (count > 100) {
            throw new Error('Failed to generate a unique pad ID after 100 attempts');
        }
    }
    
    await query(
        'INSERT INTO pads (id, language) VALUES ($1, $2) RETURNING *',
        [id, DEFAULT_LANGUAGE]
    );
    
    return id;
}

export async function getPad(id: string): Promise<Pad | null> {
    const result = await query('SELECT * FROM pads WHERE id = $1', [id]);
    return result.rows[0] || null;
}

export async function updatePad(id: string, language: string, code: string): Promise<Pad | null> {
    const result = await query(
        'UPDATE pads SET language = $2, code = $3 WHERE id = $1 RETURNING *',
        [id, language, code]
    );
    return result.rows[0] || null;
}