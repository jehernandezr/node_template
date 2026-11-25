const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'platform-persistence',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  // uuid and NestJS 12 are published only as ESM: they must be transformed for Jest to load them.
  transformIgnorePatterns: ['/node_modules/(?!(\\.pnpm/)?(uuid|@nestjs)[@/])'],
  // The CLI entry point only builds objects and runs: its logic is tested in MigrationGenerateCommand.
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '\\.entry\\.ts$',
  ],
  coverageDirectory: 'test-output/jest/coverage',
};
