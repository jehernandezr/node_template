import { nxPreset } from '@nx/jest/preset';

// Umbral mínimo de cobertura de cada proyecto del backend. Solo se aplica al
// medir cobertura (`nx test <proyecto> --coverage`, como hace CI); un proyecto
// puede declarar el suyo en su jest.config.cjs.
export default {
  ...nxPreset,
  // Las pruebas viven en la carpeta __tests__ de la carpeta que prueban: un .spec.ts
  // junto al código no se ejecuta. Las de integración terminan en .int-spec.ts.
  testMatch: ['<rootDir>/src/**/__tests__/**/*.?(int-)spec.ts'],
  coverageThreshold: {
    global: { lines: 80, statements: 80, functions: 80, branches: 75 },
  },
};
