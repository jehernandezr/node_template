import baseConfig, { allowIdentityContracts } from '../../../eslint.config.mjs';

export default [
  ...baseConfig,
  allowIdentityContracts([
    'src/auth/**/*.ts',
    'src/nest/auth/**/*.ts',
    'src/__tests__/utils/**/*.ts',
  ]),
  {
    files: ['src/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^PLATFORM\\./]',
          message:
            'Use the library error code enum instead of the code as text.',
        },
        {
          selector: 'TemplateElement[value.raw=/^PLATFORM\\./]',
          message:
            'Use the library error code enum instead of the code as text.',
        },
      ],
    },
  },
  {
    /** The codes are declared here: it is the only place where they appear as text. */
    files: ['src/errors/service-error-code.enum.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
