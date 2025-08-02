// Represents a pad in the DB
import { Language, PadRoom } from 'coderjam-shared';

export interface PadDB {
    /*
    Names of fields will be mapped to the database columns!
     */

    id: string;
    language: Language;
    code: string;
    output: string;
    created_at: Date;
    updated_at: Date;
}

export type PadStored = Pick<PadRoom, 'padId' | 'code' | 'language' | 'output'>;