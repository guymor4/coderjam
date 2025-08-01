export const SUPPORTED_LANGUAGES: string[] = ['javascript', 'typescript', 'go', 'python'];
export type Language = typeof SUPPORTED_LANGUAGES[number];

const LANGUAGES_CONFIG: Record<Language, { codeSample: string }> = {
    javascript: {
        codeSample: `console.log('Hello World!');`,
    },
    typescript: {
        codeSample: `console.log('Hello World!');`,
    },
    go: {
        codeSample: `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}`,

    }
}

export function isValidLanguage(lang: string): lang is Language {
    return SUPPORTED_LANGUAGES.includes(lang as Language);
}

export function getLanguageCodeSample(lang: Language) {
    if (!isValidLanguage(lang)) {
        throw new Error(`Unsupported language: ${lang}`);
    }
    return LANGUAGES_CONFIG[lang].codeSample;
}