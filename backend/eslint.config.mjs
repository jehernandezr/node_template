import nx from '@nx/eslint-plugin';

const awsSdkPattern = {
  group: ['@aws-sdk/*'],
  message:
    '@aws-sdk/* solo se importa dentro de backend/libs/platform/adapters/aws (ADR 0002).',
};

// Dentro del dominio no entra infraestructura ni framework.
const domainPatterns = [
  awsSdkPattern,
  {
    group: ['typeorm', 'typeorm/*', '@nestjs/*', 'pg', 'pg/*'],
    message: 'El dominio no depende de infraestructura ni de frameworks.',
  },
];

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          // Reglas de dependencia entre proyectos del ADR 0015.
          depConstraints: [
            {
              sourceTag: 'type:contracts',
              onlyDependOnLibsWithTags: ['type:contracts'],
            },
            {
              sourceTag: 'type:util',
              onlyDependOnLibsWithTags: ['type:util', 'type:contracts'],
            },
            {
              sourceTag: 'type:platform',
              onlyDependOnLibsWithTags: [
                'type:platform',
                'type:util',
                'type:contracts',
              ],
            },
            {
              sourceTag: 'type:tool',
              onlyDependOnLibsWithTags: [
                'type:contracts',
                'type:util',
                'type:platform',
              ],
            },
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:app',
                'type:platform',
                'type:util',
                'type:contracts',
              ],
            },
            // Reglas por servicio: el código interno de un servicio es privado.
            // De otro servicio solo se importa su paquete `@contracts/<servicio>`
            // (`type:contracts`). Al crear un servicio, agrega aquí su `scope:<servicio>`
            // con la misma forma que `scope:identity`.
            {
              sourceTag: 'scope:platform',
              onlyDependOnLibsWithTags: ['scope:platform', 'scope:shared'],
            },
            {
              sourceTag: 'scope:shared',
              // Las herramientas compartidas leen los contratos de todos los servicios.
              onlyDependOnLibsWithTags: [
                'scope:shared',
                'scope:platform',
                'type:contracts',
              ],
            },
            {
              sourceTag: 'scope:identity',
              onlyDependOnLibsWithTags: [
                'scope:identity',
                'scope:platform',
                'scope:shared',
                'type:contracts',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    // El SDK de AWS solo vive en libs/platform/adapters/aws. Las rutas de `files` son
    // relativas al proyecto que carga esta configuración, así que esa librería apaga
    // la regla en su propio eslint.config.mjs (`'no-restricted-imports': 'off'`).
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [awsSdkPattern] }],
    },
  },
  {
    // Cuando ESLint corre desde backend/ (hooks de git), las rutas son relativas a esta
    // carpeta y la excepción del adaptador de AWS se declara aquí.
    files: ['libs/platform/adapters/aws/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['**/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: domainPatterns }],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
