import baseConfig from '../../../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    /** The only library where @aws-sdk/* is allowed (ADR 0002). The rule lives in backend/eslint.config.mjs and is turned off here for this library's files. */
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];
