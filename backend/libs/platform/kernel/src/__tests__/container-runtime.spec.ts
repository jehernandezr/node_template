import { ContainerRuntime } from './utils/container-runtime.js';
import { FakeContainerProbe } from './utils/fake-container-probe.js';
import { IntegrationMode } from './utils/integration-mode.js';
import { SuiteApi } from './utils/suite-api.js';

class RecordingSuiteApi extends SuiteApi {
  readonly calls: string[] = [];
  private readonly tests: Array<() => void> = [];

  override describe(name: string, body: () => void): void {
    this.calls.push(`describe:${name}`);
    body();
  }

  override skip(name: string): void {
    this.calls.push(`skip:${name}`);
  }

  override it(name: string, test: () => void): void {
    this.calls.push(`it:${name}`);
    this.tests.push(test);
  }

  runTests(): void {
    for (const test of this.tests) {
      test();
    }
  }
}

function runtime(
  env: Record<string, string | undefined>,
  running: boolean,
): {
  runtime: ContainerRuntime;
  suites: RecordingSuiteApi;
  probe: FakeContainerProbe;
} {
  const suites = new RecordingSuiteApi();
  const probe = new FakeContainerProbe(running);
  return { runtime: new ContainerRuntime(env, probe, suites), suites, probe };
}

describe('ContainerRuntime', () => {
  describe('mode', () => {
    it.each([
      [{ INTEGRATION_TESTS: 'skip' }, IntegrationMode.Skip],
      [{ INTEGRATION_TESTS: 'require' }, IntegrationMode.Require],
      [{ CI: 'true' }, IntegrationMode.Require],
      [{ CI: 'false' }, IntegrationMode.Skip],
      [{}, IntegrationMode.Skip],
      [{ INTEGRATION_TESTS: '', CI: 'true' }, IntegrationMode.Require],
      [{ INTEGRATION_TESTS: 'skip', CI: 'true' }, IntegrationMode.Skip],
    ])('%j gives %s', (env, expected) => {
      expect(runtime(env, true).runtime.mode).toBe(expected);
    });

    it('rejects an unknown value and lists the valid ones', () => {
      expect(
        () => runtime({ INTEGRATION_TESTS: 'maybe' }, true).runtime.mode,
      ).toThrow('skip, require');
    });
  });

  describe('isAvailable', () => {
    it.each([true, false])(
      'returns the probe answer %s and asks once',
      (running) => {
        const { runtime: subject, probe } = runtime({}, running);
        expect(subject.isAvailable()).toBe(running);
        expect(subject.isAvailable()).toBe(running);
        expect(probe.calls).toBe(1);
      },
    );
  });

  describe('describeIfAvailable', () => {
    it('runs the suite when there is a runtime', () => {
      const { runtime: subject, suites } = runtime({}, true);
      subject.describeIfAvailable('db', () => undefined);
      expect(suites.calls).toEqual(['describe:db']);
    });

    it('skips the suite without a runtime in skip mode', () => {
      const { runtime: subject, suites } = runtime(
        { INTEGRATION_TESTS: 'skip' },
        false,
      );
      subject.describeIfAvailable('db', () => undefined);
      expect(suites.calls).toEqual(['skip:db']);
    });

    it('fails without a runtime in require mode', () => {
      const { runtime: subject, suites } = runtime(
        { INTEGRATION_TESTS: 'require' },
        false,
      );
      subject.describeIfAvailable('db', () => undefined);
      expect(suites.calls).toEqual([
        'describe:db',
        'it:needs a container runtime',
      ]);
      expect(() => suites.runTests()).toThrow('no container runtime');
    });

    it('fails on an invalid mode even when there is a runtime', () => {
      const { runtime: subject } = runtime({ INTEGRATION_TESTS: 'x' }, true);
      expect(() => subject.describeIfAvailable('db', () => undefined)).toThrow(
        'INTEGRATION_TESTS',
      );
    });
  });
});

describe('ContainerRuntime auto cleanup', () => {
  it('registers containers in the reaper unless Ryuk is disabled', () => {
    expect(new ContainerRuntime({}).autoCleanup()).toBe(true);
    expect(
      new ContainerRuntime({
        TESTCONTAINERS_RYUK_DISABLED: 'false',
      }).autoCleanup(),
    ).toBe(true);
    expect(
      new ContainerRuntime({
        TESTCONTAINERS_RYUK_DISABLED: 'true',
      }).autoCleanup(),
    ).toBe(false);
  });
});
