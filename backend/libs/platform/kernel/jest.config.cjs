const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'platform-kernel',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  // uuid v14 es ESM puro y Jest corre en CJS: se transforma también ese paquete.
  transformIgnorePatterns: ['/node_modules/(?!(\\.pnpm/)?uuid@|uuid/)'],
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: 'test-output/jest/coverage',
};
