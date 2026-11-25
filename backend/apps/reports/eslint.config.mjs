import baseConfig from '../../eslint.config.mjs';

const awsSdk = {
  group: ['@aws-sdk/*'],
  message:
    '@aws-sdk/* solo se importa dentro de backend/libs/platform/adapters/aws (ADR 0002).',
};

// A module is imported only through its index.js; its internal layers are private.
const crossModule = {
  regex:
    '^(\\.\\./)+(?!shared/)[a-z-]+/(domain|application|infrastructure|presentation)/',
  message: 'Otro modulo se importa solo por su index.js',
};

export default [
  ...baseConfig,
  {
    files: ['src/modules/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [awsSdk, crossModule] }],
    },
  },
  {
    files: ['src/modules/*/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            awsSdk,
            crossModule,
            {
              regex: '(^|/)(infrastructure|presentation)/',
              message:
                'La capa de aplicación no depende de infraestructura ni de presentación',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/modules/*/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            awsSdk,
            crossModule,
            {
              group: ['@nestjs/*', 'typeorm', 'typeorm/*', 'pg', 'pg/*'],
              message:
                'El dominio no depende de infraestructura ni de frameworks.',
            },
            {
              group: ['@platform/*', '!@platform/kernel'],
              message:
                'El dominio solo usa el kernel de la plataforma, nada más.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/shared/utils/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            awsSdk,
            {
              regex: '(^|/)modules/',
              message: 'shared/utils no importa nada de modules/',
            },
          ],
        },
      ],
    },
  },
];
