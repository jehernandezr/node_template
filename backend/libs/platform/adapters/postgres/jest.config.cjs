const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'platform-adapters-postgres',
  preset: '../../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  // Unitarias con pg-mem junto al código; integración con Testcontainers en test/integration.
  // Las de integración se saltan solas si no hay Docker (ver test/support/docker.ts).
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/test/integration/**/*.int-spec.ts',
  ],
  transformIgnorePatterns: ['/node_modules/(?!(\\.pnpm/)?uuid@|uuid/)'],
  coverageDirectory: 'test-output/jest/coverage',
};
