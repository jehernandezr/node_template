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
            'Usa PersistenceErrorCode, o PlatformErrorCode para los códigos públicos, en lugar del código como texto.',
        },
        {
          selector: 'TemplateElement[value.raw=/^PLATFORM\\./]',
          message:
            'Usa PersistenceErrorCode, o PlatformErrorCode para los códigos públicos, en lugar del código como texto.',
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
                '@aws-sdk/* solo se importa dentro de backend/libs/platform/adapters/aws (ADR 0002).',
            },
            {
              group: ['pg', 'pg/*'],
              message: 'El driver pg no se importa directamente; usa TypeORM.',
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
