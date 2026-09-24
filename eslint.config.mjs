import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

/**
 * Flat ESLint config.
 *
 * `next lint` was removed in this Next.js version, so linting runs through the
 * ESLint CLI directly (see the "lint" script in package.json).
 */
const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      '.qa-screenshots/**',
      'next-env.d.ts',
    ],
  },
];

export default config;
