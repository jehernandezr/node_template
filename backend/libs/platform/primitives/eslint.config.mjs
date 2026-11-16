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
            'Usa PrimitivesErrorCode (o el enum de la librería) en lugar del código como texto.',
        },
        {
          selector: 'TemplateElement[value.raw=/^PLATFORM\\./]',
          message:
            'Usa PrimitivesErrorCode (o el enum de la librería) en lugar del código como texto.',
        },
      ],
    },
  },
  {
    // Aquí se declaran los códigos: es el único lugar donde van como texto.
    files: ['src/errors/primitives-error-code.enum.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
