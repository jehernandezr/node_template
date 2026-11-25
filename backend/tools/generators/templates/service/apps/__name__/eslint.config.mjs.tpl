import baseConfig from '../../eslint.config.mjs';

const awsSdk = {
  group: ['@aws-sdk/*'],
  message:
    '@aws-sdk/* is only imported inside backend/libs/platform/adapters/aws (ADR 0002).',
};

// A module is imported only through its index.js; its internal layers are private.
const crossModule = {
  regex:
    '^(\\.\\./)+(?!shared/)[a-z-]+/(domain|application|infrastructure|presentation)/',
  message: 'Another module is imported only through its index.js',
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
                'The application layer does not depend on infrastructure or presentation',
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
                'The domain does not depend on infrastructure or frameworks.',
            },
            {
              group: ['@platform/*', '!@platform/kernel'],
              message:
                'The domain only uses the platform kernel, nothing else.',
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
              message: 'shared/utils imports nothing from modules/',
            },
          ],
        },
      ],
    },
  },
];
