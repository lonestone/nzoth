import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tseslintParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';

export default [
    {
        ignores: ['.eslintrc.js', '**/dist/**', '**/*.config.ts']
    },
    eslint.configs.recommended,
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tseslintParser,
            parserOptions: {
                project: ['./packages/*/tsconfig.json', './examples/tsconfig.json'],
                ecmaVersion: 'latest',
                sourceType: 'module'
            }
        },
        plugins: {
            '@typescript-eslint': tseslint,
            'prettier': prettier
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            ...prettier.configs.recommended.rules,
            '@typescript-eslint/interface-name-prefix': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            'prettier/prettier': ['error', {}, { usePrettierrc: true }]
        }
    }
]; 