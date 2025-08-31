import { useState } from 'react';
import { Select } from './Select';
import { Button } from './Button';
import { capitalize, SUPPORTED_LANGUAGES } from 'coderjam-shared';

export type HeaderProps = {
    language: string;
    onLanguageChange: (language: string) => void;
    isRunning: boolean; // Indicates if code is currently running or initializing
    onRunCode: () => void;
};

export function Header({ language, onLanguageChange, isRunning, onRunCode }: HeaderProps) {
    const [isCoderGradient, setIsCoderGradient] = useState<boolean>(true);

    return (
        <div className="flex flex-row flex-wrap md:items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-dark-800 border-b border-dark-600">
            <div className="flex items-center gap-1 md:gap-2 mb-2 md:mb-0">
                <h1
                    className="text-xl md:text-2xl font-semibold flex gap-1"
                    onMouseLeave={() => setIsCoderGradient(true)}
                >
                    <div>
                        <span
                            className={`absolute transition-all duration-300 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent`}
                        >
                            Coder
                        </span>
                        <span
                            className={`relative transition-all duration-300 text-dark-50 ${isCoderGradient ? 'opacity-0' : 'opacity-100'}`}
                            onMouseEnter={() => setIsCoderGradient(false)}
                        >
                            Coder
                        </span>
                    </div>
                    <div>
                        <span
                            className={`absolute transition-all duration-300 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent  ${!isCoderGradient ? 'opacity-100' : 'opacity-0'}`}
                        >
                            Jam
                        </span>
                        <span
                            className={`relative transition-all duration-300 text-dark-50 ${!isCoderGradient ? 'opacity-0' : 'opacity-100'}`}
                            onMouseEnter={() => setIsCoderGradient(true)}
                        >
                            Jam
                        </span>
                    </div>
                </h1>
                <a
                    href="https://github.com/guymor4/coderjam"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center p-2 text-dark-300 hover:text-dark-100 hover:bg-dark-700 rounded transition-colors duration-200"
                    title="View source on GitHub"
                >
                    <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                            clipRule="evenodd"
                        />
                    </svg>
                </a>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
                <Select
                    value={language}
                    onChange={onLanguageChange}
                    className="capitalize text-sm"
                    data-testid="language-selector"
                    disabled={isRunning}
                    options={SUPPORTED_LANGUAGES.map((lang) => ({
                        value: lang,
                        label: capitalize(lang),
                        icon: (
                            <img
                                src={`/icons/${lang}.svg`}
                                alt={`${lang} icon`}
                                className="w-4 h-4"
                            />
                        ),
                    }))}
                />
                {isRunning ? (
                    <Button disabled colorType="default" className="text-sm">
                        <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            ></circle>
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                        </svg>
                        <span className="hidden sm:inline">Running...</span>
                        <span className="sm:hidden">Run</span>
                    </Button>
                ) : (
                    <Button colorType="green" onClick={onRunCode} className="text-sm">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                        <span className="hidden sm:inline">Run Code</span>
                        <span className="sm:hidden">Run</span>
                    </Button>
                )}
            </div>
        </div>
    );
}
