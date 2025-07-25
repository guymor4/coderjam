import { RUNNERS } from './runners/runner';

export type Language = keyof typeof RUNNERS;

export function capitalize(lang: Language) {
    return lang.charAt(0).toUpperCase() + lang.slice(1);
}

export const SUPPORTED_LANGUAGES: Language[] = Object.keys(RUNNERS);
