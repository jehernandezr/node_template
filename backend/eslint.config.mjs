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

/**
 * Reglas de ubicación de archivos (skill backend-estructura). Van en un plugin propio y no en
 * `no-restricted-syntax` porque las librerías redefinen esa regla en su eslint.config.mjs.
 */
const fileRule = (message, matches) => ({
  meta: { type: 'problem', schema: [], messages: { misplaced: message } },
  create: (context) => ({
    Program(node) {
      if (matches(context.filename.replaceAll('\\', '/'))) {
        context.report({ node, messageId: 'misplaced' });
      }
    },
  }),
});

/**
 * NestJS solo entra por `src/nest/` (ADR 0025): el núcleo de las librerías no importa `@nestjs/*`
 * ni la sub-entrada `@platform/<lib>/nest` de otra librería.
 */
const nestImportSource = /^(@nestjs\/|@platform\/[\w-]+\/nest$)/;
const nestGuardedFile = /\/libs\/(platform|contracts|shared)\//;

const nestBoundaryRule = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      nestOutsideFolder:
        'Fuera de src/nest/ no se importa @nestjs/* ni una sub-entrada @platform/<lib>/nest.',
    },
  },
  create: (context) => {
    const file = context.filename.replaceAll('\\', '/');
    if (!nestGuardedFile.test(file) || file.includes('/src/nest/')) return {};
    const check = (node) => {
      const source = node.source?.value;
      if (typeof source === 'string' && nestImportSource.test(source)) {
        context.report({ node, messageId: 'nestOutsideFolder' });
      }
    };
    return {
      ImportDeclaration: check,
      ExportAllDeclaration: check,
      ExportNamedDeclaration: check,
      ImportExpression: check,
    };
  },
};

const layoutPlugin = {
  rules: {
    'no-nest-outside-nest-folder': nestBoundaryRule,
    // Jest solo ejecuta las pruebas de las carpetas __tests__ (jest.preset.js): una
    // prueba fuera de ellas no correría nunca.
    'tests-in-tests-folder': fileRule(
      'Las pruebas van en la carpeta __tests__ de la carpeta del código que prueban.',
      (file) =>
        /\.(int-)?spec\.ts$/.test(file) && !file.includes('/__tests__/'),
    ),
    // Lo que comparten las pruebas (fakes, builders, contenedores) vive en __tests__/utils.
    'test-utils-in-tests-folder': fileRule(
      'Los utilitarios de prueba van en __tests__/utils, no en una carpeta testing aparte.',
      (file) =>
        /\/src\/(.+\/)?(testing|test|support)\//.test(file) &&
        !file.includes('/__tests__/'),
    ),
    'no-src-lib': fileRule(
      'El código va directo en src/, sin src/lib/.',
      (file) => file.includes('/src/lib/'),
    ),
  },
};

// Reglas de dependencia entre proyectos del ADR 0015.
const depConstraints = [
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
    onlyDependOnLibsWithTags: ['type:platform', 'type:util', 'type:contracts'],
  },
  {
    sourceTag: 'type:tool',
    onlyDependOnLibsWithTags: ['type:contracts', 'type:util', 'type:platform'],
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
  // La prueba de punta a punta del flujo de la plataforma: lee contratos y librerías, y entra a las apps por la
  // excepción de `allowAppImports`.
  {
    sourceTag: 'type:e2e',
    onlyDependOnLibsWithTags: [
      'type:app',
      'type:platform',
      'type:util',
      'type:contracts',
    ],
  },
  {
    sourceTag: 'scope:e2e',
    onlyDependOnLibsWithTags: [
      'scope:platform',
      'scope:shared',
      'type:contracts',
    ],
  },
  ...['tasks', 'notifications', 'realtime', 'reports', 'billing'].map(
    (service) => ({
      sourceTag: `scope:${service}`,
      onlyDependOnLibsWithTags: [
        `scope:${service}`,
        'scope:platform',
        'scope:shared',
        'type:contracts',
      ],
    }),
  ),
];

/**
 * Excepciones a `scope:platform` para leer contratos de un servicio: `@platform/auth` y sus vecinos leen el
 * formato del token y sus códigos de `@contracts/identity` (ADR 0022); `@platform/quotas` y
 * `@platform/metering` hablan con billing por su operación de cuotas y su comando de uso. La regla se vuelve a
 * declarar completa porque una configuración posterior reemplaza las opciones de la anterior; solo cambia la
 * restricción de `scope:platform`. Cada librería la usa con las rutas de `files` relativas a su proyecto.
 */
const allowServiceContracts = (scopes) => (files) => ({
  files,
  rules: {
    '@nx/enforce-module-boundaries': [
      'error',
      {
        enforceBuildableLibDependency: true,
        allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
        depConstraints: depConstraints.map((constraint) =>
          constraint.sourceTag === 'scope:platform'
            ? {
                ...constraint,
                onlyDependOnLibsWithTags: [
                  ...constraint.onlyDependOnLibsWithTags,
                  ...scopes,
                ],
              }
            : constraint,
        ),
      },
    ],
  },
});

const allowIdentityContracts = allowServiceContracts(['scope:identity']);
const allowBillingContracts = allowServiceContracts([
  'scope:billing',
  'scope:identity',
]);

/**
 * Nx prohíbe importar una app desde cualquier proyecto. La prueba de punta a punta arranca los cinco servicios en un
 * proceso y es el único proyecto que entra a ellos, solo por `@apps/<servicio>/test-utils`.
 */
const allowAppImports = (files) => ({
  files,
  rules: {
    '@nx/enforce-module-boundaries': [
      'error',
      {
        enforceBuildableLibDependency: true,
        allow: [
          '^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$',
          '^@apps/[a-z-]+/test-utils$',
        ],
        depConstraints,
      },
    ],
  },
});

export {
  allowAppImports,
  allowBillingContracts,
  allowIdentityContracts,
  layoutPlugin,
};

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist'],
  },
  {
    files: ['**/*.ts'],
    plugins: { layout: layoutPlugin },
    rules: {
      'layout/tests-in-tests-folder': 'error',
      'layout/no-src-lib': 'error',
      'layout/no-nest-outside-nest-folder': 'error',
      'layout/test-utils-in-tests-folder': 'error',
    },
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
          depConstraints,
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
  // Cuando ESLint corre desde backend/, la excepción de auth y de http se declara con rutas de esta carpeta.
  allowIdentityContracts([
    'libs/platform/auth/**/*.ts',
    'libs/platform/http/**/*.ts',
    'libs/platform/realtime/**/*.ts',
    'libs/platform/service/src/auth/**/*.ts',
    'libs/platform/service/src/nest/auth/**/*.ts',
    'libs/platform/service/src/__tests__/utils/**/*.ts',
  ]),
  allowBillingContracts([
    'libs/platform/quotas/**/*.ts',
    'libs/platform/metering/**/*.ts',
  ]),
  allowAppImports(['e2e/**/*.ts']),
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
