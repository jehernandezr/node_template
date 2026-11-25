const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'generators',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: 'test-output/jest/coverage',
  // main.ts only composes, and prettier loads its plugins with dynamic import(), which jest does not run without
  // --experimental-vm-modules. generators:verify covers them.
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/main\\.ts$',
    '/prettier-formatter\\.ts$',
    '/node-file-system\\.ts$',
  ],
};
