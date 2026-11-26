import { nxPreset } from '@nx/jest/preset';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);

/**
 * Which tests a Jest run selects: `NT_TEST_KIND` when set, otherwise the Nx target that runs it. The `test` target
 * runs the unit tests, `test-int` the container tests and `test-int:ci` both; a direct `jest` call runs everything.
 */
class TestKind {
  static UNIT = 'unit';
  static INTEGRATION = 'integration';
  static ALL = 'all';
  static CONTAINER_SPEC = '\\.(int|e2e)-spec\\.ts$';

  static BY_TARGET = new Map([
    ['test', TestKind.UNIT],
    ['test-int', TestKind.INTEGRATION],
    ['test-int:ci', TestKind.ALL],
  ]);

  /**
   * @param {NodeJS.ProcessEnv} env Environment of the Jest process.
   */
  constructor(env) {
    const kinds = [TestKind.UNIT, TestKind.INTEGRATION, TestKind.ALL];
    const raw = env['NT_TEST_KIND'];
    if (raw !== undefined && raw !== '' && !kinds.includes(raw)) {
      throw new Error(`NT_TEST_KIND must be one of: ${kinds.join(', ')}`);
    }
    const configuration = env['NX_TASK_TARGET_CONFIGURATION'];
    const target = `${env['NX_TASK_TARGET_TARGET'] ?? ''}${configuration ? `:${configuration}` : ''}`;
    this.kind =
      raw === undefined || raw === ''
        ? (TestKind.BY_TARGET.get(target) ?? TestKind.ALL)
        : raw;
    this.cacheDirectory =
      env['NT_JEST_CACHE_DIRECTORY'] ||
      join(homedir(), '.cache', 'node-template', 'jest');
  }

  /**
   * Jest options that select the tests of this kind and keep the transform cache in one folder on disk that every
   * worktree shares, outside the temporary folder, which is small on the build machine; the container kinds share one PostgreSQL and one Valkey.
   * @returns {Record<string, unknown>} Options merged into the preset.
   */
  options() {
    return {
      passWithNoTests: true,
      cacheDirectory: this.cacheDirectory,
      ...this.#selection(),
    };
  }

  #selection() {
    if (this.kind === TestKind.UNIT) {
      return {
        maxWorkers: '50%',
        testPathIgnorePatterns: ['/node_modules/', TestKind.CONTAINER_SPEC],
      };
    }
    const servers = {
      globalSetup: require.resolve('./jest.global-setup.cjs'),
      globalTeardown: require.resolve('./jest.global-teardown.cjs'),
      maxWorkers: 1,
    };
    if (this.kind === TestKind.INTEGRATION) {
      return {
        ...servers,
        testPathIgnorePatterns: [
          '/node_modules/',
          `^(?!.*${TestKind.CONTAINER_SPEC})`,
        ],
      };
    }
    return servers;
  }
}

/** Minimum coverage threshold of each backend project. It only applies when measuring coverage (`nx test <project> --coverage`, as CI does); a project can declare its own in its jest.config.cjs. */
export default {
  ...nxPreset,
  /** Tests live in the __tests__ folder of the folder they test: a .spec.ts next to the code does not run. Integration tests end in .int-spec.ts and the contract tests of a port in .contract-spec.ts. */
  testMatch: ['<rootDir>/src/**/__tests__/**/*.?(int-|contract-)spec.ts'],
  /** Test utilities (__tests__/utils) are not production code and do not count toward coverage. */
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/'],
  coverageThreshold: {
    global: { lines: 80, statements: 80, functions: 80, branches: 75 },
  },
  ...new TestKind(process.env).options(),
};
