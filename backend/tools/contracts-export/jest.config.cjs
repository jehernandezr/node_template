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
  // main.ts only composes, and the module loader and prettier use dynamic import(), which jest
  // does not run without --experimental-vm-modules. contracts-export:check covers them.
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/main\\.ts$',
    '/node-module-loader\\.ts$',
    '/prettier-artifact-renderer\\.ts$',
  ],
};
