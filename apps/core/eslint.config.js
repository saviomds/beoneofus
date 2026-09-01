import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import reactHooks from 'eslint-plugin-react-hooks'

const browserGlobals = {
  window: 'readonly', document: 'readonly', localStorage: 'readonly', sessionStorage: 'readonly',
  setTimeout: 'readonly', clearTimeout: 'readonly', clearInterval: 'readonly', setInterval: 'readonly',
  console: 'readonly', fetch: 'readonly', FormData: 'readonly', Blob: 'readonly', File: 'readonly',
  HTMLElement: 'readonly', HTMLInputElement: 'readonly', HTMLButtonElement: 'readonly',
  HTMLTextAreaElement: 'readonly', HTMLSelectElement: 'readonly', HTMLFormElement: 'readonly',
  KeyboardEvent: 'readonly', MouseEvent: 'readonly', Event: 'readonly', CustomEvent: 'readonly',
  Node: 'readonly', URL: 'readonly', URLSearchParams: 'readonly', navigator: 'readonly', crypto: 'readonly',
}
const nodeGlobals = {
  process: 'readonly', Buffer: 'readonly', console: 'readonly', setTimeout: 'readonly',
  clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', URL: 'readonly',
  __dirname: 'readonly', __filename: 'readonly', fetch: 'readonly', crypto: 'readonly',
  structuredClone: 'readonly', globalThis: 'readonly',
}

const commonRules = {
  ...tseslint.configs.recommended.rules,
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  '@typescript-eslint/no-explicit-any': 'warn',
  'no-empty': ['error', { allowEmptyCatch: true }],
  'no-undef': 'off',
}

export default [
  { ignores: ['dist/**', 'node_modules/**', 'data/**', '**/seed/*.json', 'scripts/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'shared/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals: browserGlobals,
    },
    plugins: { '@typescript-eslint': tseslint, 'react-hooks': reactHooks },
    rules: {
      ...commonRules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['server/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals: nodeGlobals,
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: commonRules,
  },
]
