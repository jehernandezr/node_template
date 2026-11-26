import nx from '@nx/eslint-plugin';
import { commentsPlugin } from './eslint.comments.mjs';

const awsSdkPattern = {
  group: ['@aws-sdk/*'],
  message:
    '@aws-sdk/* is only imported inside backend/libs/platform/adapters/aws (ADR 0002).',
};

/** No infrastructure or framework enters the domain. */
const domainPatterns = [
  awsSdkPattern,
  {
    group: ['typeorm', 'typeorm/*', '@nestjs/*', 'pg', 'pg/*'],
    message: 'The domain does not depend on infrastructure or frameworks.',
  },
];

/**
 * File location rules (backend-structure skill). They live in their own plugin and not in
 * `no-restricted-syntax` because the libraries redefine that rule in their eslint.config.mjs.
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
 * NestJS only enters through `src/nest/` (ADR 0025): the core of the libraries does not import `@nestjs/*`
 * nor the `@platform/<lib>/nest` sub-entry of another library.
 */
const nestImportSource = /^(@nestjs\/|@platform\/[\w-]+\/nest$)/;
const nestGuardedFile = /\/libs\/(platform|contracts|shared)\//;

const nestBoundaryRule = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      nestOutsideFolder:
        'Outside src/nest/, @nestjs/* and @platform/<lib>/nest sub-entries are not imported.',
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
    /** Jest only runs tests in __tests__ folders (jest.preset.js): a test outside them would never run. */
    'tests-in-tests-folder': fileRule(
      'Tests go in the __tests__ folder of the folder holding the code they test.',
      (file) =>
        /\.(int-)?spec\.ts$/.test(file) && !file.includes('/__tests__/'),
    ),
    /** What tests share (fakes, builders, containers) lives in __tests__/utils. */
    'test-utils-in-tests-folder': fileRule(
      'Test utilities go in __tests__/utils, not in a separate testing folder.',
      (file) =>
        /\/src\/(.+\/)?(testing|test|support)\//.test(file) &&
        !file.includes('/__tests__/'),
    ),
    'no-src-lib': fileRule(
      'Code goes directly in src/, without src/lib/.',
      (file) => file.includes('/src/lib/'),
    ),
  },
};

/**
 * Dependency rules between projects from ADR 0015. Per service, a service's internal code is private: from another
 * service only its `@contracts/<service>` package is imported (`type:contracts`), so a new service adds its
 * `scope:<service>` with the same shape as `scope:identity`. The end-to-end test of the platform flow reads contracts
 * and libraries, and enters the apps through the `allowAppImports` exception.
 */
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
  {
    sourceTag: 'scope:platform',
    onlyDependOnLibsWithTags: ['scope:platform', 'scope:shared'],
  },
  {
    sourceTag: 'scope:shared',
    /** The shared tools read the contracts of all services. */
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
 * Exceptions to `scope:platform` for reading a service's contracts: `@platform/auth` and its neighbors read the
 * token format and its codes from `@contracts/identity` (ADR 0022); `@platform/quotas` and
 * `@platform/metering` talk to billing through its quota operation and its usage command. The rule is declared
 * again in full because a later configuration replaces the options of the earlier one; only the
 * `scope:platform` restriction changes. Each library uses it with `files` paths relative to its project.
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

/** The auth exception, also declared with paths from backend/ for when ESLint runs from that folder. */
const allowIdentityContracts = allowServiceContracts(['scope:identity']);
const allowBillingContracts = allowServiceContracts([
  'scope:billing',
  'scope:identity',
]);

/**
 * Nx forbids importing an app from any project. The end-to-end test starts the five services in one
 * process and is the only project that enters them, only through `@apps/<service>/test-utils`.
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
    files: ['**/*.ts', '**/*.js', '**/*.mjs', '**/*.cjs'],
    plugins: { comments: commentsPlugin },
    rules: {
      'comments/no-inline-comments': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/no-empty-function': [
        'error',
        { allow: ['overrideMethods'] },
      ],
    },
  },
  {
    files: ['**/*.ts'],
    ignores: [
      '**/__tests__/**',
      '**/*.spec.ts',
      '**/*.int-spec.ts',
      '**/*.e2e-spec.ts',
      '**/migrations/**',
    ],
    languageOptions: { parserOptions: { projectService: true } },
    rules: { 'comments/require-public-jsdoc': 'warn' },
  },
  {
    files: ['**/migrations/**/*.ts'],
    rules: { 'comments/no-inline-comments': 'off' },
  },
  {
    files: ['**/__tests__/**/*.ts'],
    rules: { '@typescript-eslint/no-empty-function': 'off' },
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
          /** Dependency rules between projects from ADR 0015. */
          depConstraints,
        },
      ],
    },
  },
  {
    /** The AWS SDK only lives in libs/platform/adapters/aws. The `files` paths are relative to the project that loads this configuration, so that library turns off the rule in its own eslint.config.mjs (`'no-restricted-imports': 'off'`). */
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [awsSdkPattern] }],
    },
  },
  {
    /** When ESLint runs from backend/ (git hooks), paths are relative to this folder and the AWS adapter exception is declared here. */
    files: ['libs/platform/adapters/aws/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
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
    rules: {},
  },
];
