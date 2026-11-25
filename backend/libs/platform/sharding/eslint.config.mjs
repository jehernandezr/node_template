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
            'Usa el enum de códigos de la librería en lugar del código como texto.',
        },
        {
          selector: 'TemplateElement[value.raw=/^PLATFORM\\./]',
          message:
            'Usa el enum de códigos de la librería en lugar del código como texto.',
        },
      ],
    },
  },
  {
    // The codes are declared here: it is the only place where they appear as text.
    files: ['src/errors/sharding-error-code.enum.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
