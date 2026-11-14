const nxPreset = require('@nx/jest/preset').default;

// Umbral mínimo de cobertura de cada proyecto del backend. Solo se aplica al
// medir cobertura (`nx test <proyecto> --coverage`, como hace CI); un proyecto
// puede declarar el suyo en su jest.config.cjs.
module.exports = {
  ...nxPreset,
  coverageThreshold: {
    global: { lines: 80, statements: 80, functions: 80, branches: 75 },
  },
};
