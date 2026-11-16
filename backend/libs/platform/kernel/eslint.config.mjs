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
    // Aquí se declaran los códigos: es el único lugar donde van como texto.
    files: ['src/errors/kernel-error-code.enum.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
