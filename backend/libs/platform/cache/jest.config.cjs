const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'platform-cache',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  // @nestjs/* is ESM only: Jest must transform it to be able to load it.
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm/)?(@nestjs\\+|@nestjs/|uid@|uid/|load-esm@|load-esm/))',
  ],
  coverageDirectory: 'test-output/jest/coverage',
};
