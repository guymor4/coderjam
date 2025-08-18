import globals from "globals";
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';

export default [
    js.configs.recommended,
    {
        files: ['**/*.ts'],
        plugins: {
            '@typescript-eslint': tsPlugin,
            'import': importPlugin,
        },
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                project: './tsconfig.json',
            },
            globals: {
                ...globals.node
            },
        },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/explicit-function-return-type': 'warn',
            '@typescript-eslint/no-explicit-any': 'error',
            'prefer-const': 'error',
            'no-console': 'off',
            // Require .js extensions for relative imports in ES modules
            'import/extensions': ['error', 'always', {
                'js': 'always',
                'ts': 'never', // TypeScript files don't need .ts extension
                'json': 'always',
                'ignorePackages': true // Ignore node_modules packages
            }],
        },
    },
    {
        ignores: ['dist/', 'node_modules/'],
    },
];