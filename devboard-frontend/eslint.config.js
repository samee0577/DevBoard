import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Guest demo mode is only safe because the sandbox cannot reach the API or a
    // database session. Rather than trusting review to catch a stray import, forbid
    // the modules that can do either, in the sandbox folder only.
    files: ['src/features/demo/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: '../../auth', message: 'The guest sandbox must never touch a real session. Add a gateway method instead.' },
          { name: '../auth', message: 'The guest sandbox must never touch a real session. Add a gateway method instead.' },
          { name: '../../projects/lib/api', message: 'The guest sandbox must never reach the network. Add a gateway method instead.' },
          { name: '../projects/lib/api', message: 'The guest sandbox must never reach the network. Add a gateway method instead.' },
        ],
        patterns: [
          {
            group: ['**/auth', '**/lib/api'],
            message: 'The guest sandbox must never reach the network or a real session. Add a gateway method instead.',
          },
        ],
      }],
    },
  },
])
