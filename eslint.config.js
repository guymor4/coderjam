// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier'; // ✅

import { globalIgnores } from 'eslint/config';

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      prettier, // ✅ register plugin
    },
    rules: {
      'prettier/prettier': 'error', // ✅ enforce Prettier
      'react-hooks/exhaustive-deps': 'warn', // ✅ warn on missing dependencies in hooks
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    ignores: ['dist'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
  },
]);
