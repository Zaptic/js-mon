module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json'],
        ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
        sourceType: 'module', // Allows for the use of imports
    },
    plugins: ['@typescript-eslint'],
    extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'prettier/@typescript-eslint',
        'plugin:prettier/recommended',
    ],
    rules: {
        'no-console': 'error',
        // Don't know why anyone would force you to type everything when TS has type inference
        '@typescript-eslint/explicit-function-return-type': 'off',
        // Doesn't really matter when things are defined and this would prevent having circular dependencies between functions
        // which is often used when having recursive functions.
        '@typescript-eslint/no-use-before-define': 'off',
        quotes: ['error', 'single'],
    },
}
