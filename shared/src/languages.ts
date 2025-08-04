export const SUPPORTED_LANGUAGES: string[] = ['javascript', 'typescript', 'go', 'python'];
export type Language = 'javascript' | 'typescript' | 'python' | 'go';

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
    },
    python: {
        codeSample:`import random
import string

def generate_password(length=12):
    characters = string.ascii_letters + string.digits + string.punctuation
    return ''.join(random.choice(characters) for _ in range(length))

password = generate_password()
print(password)
`
    }
}

export function isValidLanguage(lang: string): lang is Language {
    return SUPPORTED_LANGUAGES.includes(lang as Language);
}

export function getLanguageCodeSample(lang: Language): string {
    if (!isValidLanguage(lang)) {
        throw new Error(`Unsupported language: ${lang}`);
    }
    return LANGUAGES_CONFIG[lang].codeSample;
}
