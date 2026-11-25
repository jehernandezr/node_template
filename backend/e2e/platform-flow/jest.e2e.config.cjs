const { readFileSync } = require('fs');

const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);
swcJestConfig.swcrc = false;

// It is not called jest.config.cjs so Nx does not add it to the `test` target: it runs separately with `platform-flow:e2e`,
// serially, because it starts the five services in one process.
module.exports = {
  displayName: 'platform-flow',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.e2e-spec.ts'],
  // @nestjs/*, uid and load-esm are published only as ESM: Jest has to transform them to load them.
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm/)?(@nestjs\\+|@nestjs/|uid@|uid/|load-esm@|load-esm/))',
  ],
  // The project has no code of its own outside __tests__: there is no coverage to measure.
  coverageThreshold: {},
};
