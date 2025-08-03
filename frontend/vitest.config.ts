import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/__tests__/*.ts*'],
    },
    resolve: {
        alias: {
            'coderjam-shared': path.resolve(__dirname, '../shared/dist/index.js'),
        },
    },
});
