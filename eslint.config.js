// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    files: ["src/**/*.{js,ts}"],
  },
  {
    ignores: ["**/static/**", "**/scripts/**", "**/scripts-src/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);
