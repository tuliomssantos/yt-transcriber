// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';

const compat = new FlatCompat({
  baseDirectory: path.resolve(process.cwd(), 'node_modules'),
});

export default defineConfig([
  // JS rules
  js.configs.recommended,

  // TS rules
  tseslint.configs.recommended,

  // Disable the triple-slash rule only in sst.config.ts
  {
    files: ['sst.config.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },

  // Browser + Node globals
  {
    files: ['**/*.{js,cjs,mjs,ts,cts,mts}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // Prettier at the end
  ...compat.extends('plugin:prettier/recommended'),
]);
