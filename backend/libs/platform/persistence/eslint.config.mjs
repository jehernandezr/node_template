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
    // El driver `pg` no se importa: la capa va sobre TypeORM.
    files: ['src/**/*.ts'],
    ignores: ['src/index.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // Redefinir la regla reemplaza la de la base: se repite la restricción del SDK de AWS.
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
    // Aquí se declaran los códigos: es el único lugar donde van como texto.
    files: ['src/errors/persistence-error-code.enum.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
