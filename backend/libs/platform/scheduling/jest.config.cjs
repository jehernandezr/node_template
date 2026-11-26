const { readFileSync } = require('fs');

const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'platform-scheduling',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  /** NestJS 12 is published only as ESM: it has to be transformed for Jest to load it. */
  transformIgnorePatterns: ['/node_modules/(?!(\\.pnpm/)?@nestjs[@/])'],
  coverageDirectory: 'test-output/jest/coverage',
};
