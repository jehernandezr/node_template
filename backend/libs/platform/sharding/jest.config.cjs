const { readFileSync } = require('fs');

const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'platform-sharding',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  /** uuid and NestJS 12 are published only as ESM: they have to be transformed for Jest to load them. */
  transformIgnorePatterns: ['/node_modules/(?!(\\.pnpm/)?(uuid|@nestjs)[@/])'],
  coverageDirectory: 'test-output/jest/coverage',
};
