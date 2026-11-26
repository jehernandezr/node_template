const { readFileSync } = require('fs');

const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);
swcJestConfig.swcrc = false;

/** The unit tests of the suite's clients. The suite itself runs with `deploy-smoke:run` against a deployed environment. */
module.exports = {
  displayName: 'deploy-smoke',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.spec.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/'],
  coverageProvider: 'v8',
  coverageDirectory: 'test-output/jest/coverage',
};
