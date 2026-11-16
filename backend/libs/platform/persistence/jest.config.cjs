const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'platform-persistence',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  // uuid y NestJS 12 se publican solo como ESM: hay que transformarlos para que Jest los cargue.
  transformIgnorePatterns: ['/node_modules/(?!(\\.pnpm/)?(uuid|@nestjs)[@/])'],
  // El punto de entrada de la CLI solo arma objetos y corre: su lógica se prueba en MigrationGenerateCommand.
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '\\.entry\\.ts$',
  ],
  coverageDirectory: 'test-output/jest/coverage',
};
