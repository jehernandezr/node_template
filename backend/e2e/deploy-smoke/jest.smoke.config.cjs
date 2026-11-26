const { readFileSync } = require('fs');
const { nxPreset } = require('@nx/jest/preset');

const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);
swcJestConfig.swcrc = false;

/**
 * Not called jest.config.cjs so Nx does not add it to `test` or `test-int`: the suite runs only with `deploy-smoke:run`,
 * against the environment that `SMOKE_BASE_URL` and `SMOKE_ACCOUNT` name. It starts no containers.
 */
module.exports = {
  ...nxPreset,
  displayName: 'deploy-smoke',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.e2e-spec.ts'],
};
