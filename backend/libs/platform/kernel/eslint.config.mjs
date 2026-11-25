import baseConfig from '../../../eslint.config.mjs';

const literalMessage =
  'Usa KernelErrorCode (o el enum de la librería) en lugar del código como texto.';

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
          message: literalMessage,
        },
        {
          selector: 'TemplateElement[value.raw=/^PLATFORM\\./]',
          message: literalMessage,
        },
      ],
    },
  },
  {
    // The codes are declared here: it is the only place where they go as text.
    files: ['src/errors/kernel-error-code.enum.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
