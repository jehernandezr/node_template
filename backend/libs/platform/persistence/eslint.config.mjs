import baseConfig from '../../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^PLATFORM\\./]',
          message:
            'Use PersistenceErrorCode, or PlatformErrorCode for public codes, instead of the code as text.',
        },
        {
          selector: 'TemplateElement[value.raw=/^PLATFORM\\./]',
          message:
            'Use PersistenceErrorCode, or PlatformErrorCode for public codes, instead of the code as text.',
        },
      ],
    },
  },
  {
    // The `pg` driver is not imported: the layer sits on top of TypeORM.
    files: ['src/**/*.ts'],
    ignores: ['src/index.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // Redefining the rule replaces the base one: the AWS SDK restriction is repeated.
          patterns: [
            {
              group: ['@aws-sdk/*'],
              message:
                '@aws-sdk/* is only imported inside backend/libs/platform/adapters/aws (ADR 0002).',
            },
            {
              group: ['pg', 'pg/*'],
              message: 'Do not import the pg driver directly; use TypeORM.',
            },
          ],
        },
      ],
    },
  },
  {
    // Codes are declared here: it is the only place where they appear as text.
    files: ['src/errors/persistence-error-code.enum.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
