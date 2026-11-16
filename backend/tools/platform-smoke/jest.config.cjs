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
  // uuid y NestJS 12 se publican solo como ESM: hay que transformarlos para que Jest los cargue.
  transformIgnorePatterns: ['/node_modules/(?!(\\.pnpm/)?(uuid|@nestjs)[@/])'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  // main.ts e instrumentation.ts arrancan el proceso real; sus pruebas solo leen su texto.
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    'src/main.ts',
    'src/instrumentation.ts',
  ],
  // SWC emite una rama `typeof X === 'undefined'` por cada tipo de parámetro decorado que Istanbul cuenta como no cubierta; V8 mide solo el código que se ejecuta.
  coverageProvider: 'v8',
  coverageDirectory: 'test-output/jest/coverage',
};
