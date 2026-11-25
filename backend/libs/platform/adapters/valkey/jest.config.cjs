const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'platform-adapters-valkey',
  preset: '../../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  // NestJS 12 is published only as ESM: it has to be transformed for Jest to load it.
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm/)?((uuid|cockatiel|uid|load-esm)[@/]|@nestjs[@/+]))',
  ],
  coverageDirectory: 'test-output/jest/coverage',
};
