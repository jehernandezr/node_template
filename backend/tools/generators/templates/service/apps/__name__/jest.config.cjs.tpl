const { readFileSync } = require('fs');

const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

swcJestConfig.swcrc = false;

module.exports = {
  displayName: '__name__',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  /** Besides the tests in the `__tests__` folders of `src`, the end-to-end tests of the whole app. */
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.?(int-|contract-)spec.ts',
    '<rootDir>/e2e/**/*.e2e-spec.ts',
  ],
  /** @nestjs/*, uid and load-esm are published only as ESM: Jest has to transform them to load them. */
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm/)?(@nestjs\\+|@nestjs/|uid@|uid/|load-esm@|load-esm/))',
  ],
  /** The entry points start the real process: their tests only read their text. */
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/e2e/',
    'src/main.ts',
    'src/worker.ts',
    'src/migrate.ts',
    'src/lambda.ts',
    'src/instrumentation.ts',
  ],
  /** SWC emits a `typeof X === 'undefined'` branch for each decorated parameter type that Istanbul counts as uncovered; V8 measures only the code that runs. */
  coverageProvider: 'v8',
  coverageDirectory: 'test-output/jest/coverage',
};
