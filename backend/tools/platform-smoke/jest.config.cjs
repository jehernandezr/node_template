const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'platform-smoke',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  // uuid and NestJS 12 are published only as ESM: they have to be transformed for Jest to load them.
  transformIgnorePatterns: ['/node_modules/(?!(\\.pnpm/)?(uuid|@nestjs)[@/])'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  // main.ts and instrumentation.ts start the real process; their tests only read their text.
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    'src/main.ts',
    'src/instrumentation.ts',
  ],
  // SWC emits a `typeof X === 'undefined'` branch for each decorated parameter type that Istanbul counts as uncovered; V8 measures only the code that runs.
  coverageProvider: 'v8',
  coverageDirectory: 'test-output/jest/coverage',
};
