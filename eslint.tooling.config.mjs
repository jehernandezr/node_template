import { commentsPlugin } from './backend/eslint.comments.mjs';

/**
 * Comment rules of the backend applied to the JavaScript tooling of the repository: the skill scripts and hooks under
 * `.claude` and the front tools. Tooling scripts are read more than they are called, so their private methods carry a
 * JSDoc too. The workflow scripts under `.claude/workflows` are run by the agent harness and are
 * not part of the repository tooling.
 */
export default [
  {
    files: ['**/*.mjs', '**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'commonjs' },
  },
  {
    files: ['**/*.mjs', '**/*.js', '**/*.cjs'],
    plugins: { comments: commentsPlugin },
    rules: { 'comments/no-inline-comments': 'error' },
  },
  {
    files: ['**/*.mjs', '**/*.js', '**/*.cjs'],
    ignores: ['**/__tests__/**', '**/*.test.mjs'],
    rules: {
      'comments/require-public-jsdoc': ['error', { privateMethods: true }],
    },
  },
];
