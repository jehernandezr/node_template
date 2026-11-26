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
    /** Codes are declared here: it is the only place where they appear as text. */
    files: ['src/errors/messaging-error-code.enum.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
