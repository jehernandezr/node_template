const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'billing',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  // Además de las pruebas de `src/**/__tests__`, las de extremo a extremo de la app completa.
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.?(int-|contract-)spec.ts',
    '<rootDir>/e2e/**/*.e2e-spec.ts',
  ],
  // @nestjs/*, uid y load-esm se publican solo como ESM: Jest tiene que transformarlos para cargarlos.
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm/)?(@nestjs\\+|@nestjs/|uid@|uid/|load-esm@|load-esm/))',
  ],
  // Los puntos de entrada arrancan el proceso real: sus pruebas solo leen su texto.
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/e2e/',
    'src/main.ts',
    'src/worker.ts',
    'src/migrate.ts',
    'src/lambda.ts',
    'src/seed.ts',
    'src/instrumentation.ts',
  ],
  // SWC emite una rama `typeof X === 'undefined'` por cada tipo de parámetro decorado que Istanbul cuenta como no cubierta; V8 mide solo el código que se ejecuta.
  coverageProvider: 'v8',
  coverageDirectory: 'test-output/jest/coverage',
};
