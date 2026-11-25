const { readFileSync } = require('fs');

const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);
swcJestConfig.swcrc = false;

// No se llama jest.config.cjs para que Nx no la sume al target `test`: corre aparte con `platform-flow:e2e`,
// en serie, porque arranca los cinco servicios en un proceso.
module.exports = {
  displayName: 'platform-flow',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.e2e-spec.ts'],
  // @nestjs/*, uid y load-esm se publican solo como ESM: Jest tiene que transformarlos para cargarlos.
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm/)?(@nestjs\\+|@nestjs/|uid@|uid/|load-esm@|load-esm/))',
  ],
  // El proyecto no tiene código propio fuera de __tests__: no hay cobertura que medir.
  coverageThreshold: {},
};
