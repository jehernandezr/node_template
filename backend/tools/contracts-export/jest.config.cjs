const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'contracts-export',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: 'test-output/jest/coverage',
  // main.ts solo compone, y el cargador de módulos y prettier usan import() dinámico, que jest
  // no ejecuta sin --experimental-vm-modules. Los cubre contracts-export:check.
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/main\\.ts$',
    '/node-module-loader\\.ts$',
    '/prettier-artifact-renderer\\.ts$',
  ],
};
