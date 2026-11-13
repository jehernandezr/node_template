import baseConfig from '../../../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    // Única librería donde entra @aws-sdk/* (ADR 0002). La regla vive en
    // backend/eslint.config.mjs y aquí se apaga para los archivos de esta librería.
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: ['{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}'],
          // tslib solo lo usa el build (importHelpers).
          ignoredDependencies: ['tslib'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    ignores: ['**/out-tsc'],
  },
];
