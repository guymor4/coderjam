module.exports = {
    parser: '@typescript-eslint/parser',
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
    ],
    plugins: ['react', 'react-hooks', 'jsx-a11y', 'import', '@typescript-eslint', 'prettier'],
    rules: {
        'prettier/prettier': 'error',
        'react/react-in-jsx-scope': 'off', // not needed with Vite
    },
    settings: {
        react: { version: 'detect' },
    },
};
