import { nxPreset } from '@nx/jest/preset';

// Minimum coverage threshold of each backend project. It only applies when
// measuring coverage (`nx test <project> --coverage`, as CI does); a project
// can declare its own in its jest.config.cjs.
export default {
  ...nxPreset,
  // Tests live in the __tests__ folder of the folder they test: a .spec.ts
  // next to the code does not run. Integration tests end in .int-spec.ts and port
  // contract tests in .contract-spec.ts.
  testMatch: ['<rootDir>/src/**/__tests__/**/*.?(int-|contract-)spec.ts'],
  // Test utilities (__tests__/utils) are not production code and do not count toward coverage.
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/'],
  coverageThreshold: {
    global: { lines: 80, statements: 80, functions: 80, branches: 75 },
  },
};
