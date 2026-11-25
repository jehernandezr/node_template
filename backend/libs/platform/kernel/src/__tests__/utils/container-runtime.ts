import { ContainerProbe } from './container-probe.js';
import { DockerCliProbe } from './docker-cli-probe.js';
import { IntegrationMode } from './integration-mode.js';
import { JestSuiteApi } from './jest-suite-api.js';
import type { SuiteApi } from './suite-api.js';

/**
 * Decides whether the tests that need containers run. A single variable,
 * `INTEGRATION_TESTS=skip|require`, and a single Docker detection for all
 * the libraries.
 */
export class ContainerRuntime {
  private available: boolean | undefined;

  constructor(
    private readonly env: Readonly<Record<string, string | undefined>>,
    private readonly probe: ContainerProbe = new DockerCliProbe(),
    private readonly suites: SuiteApi = new JestSuiteApi(),
  ) {}

  /**
   * Returns the value of `INTEGRATION_TESTS`. Without a value, `Require` if `CI` is `true` and
   * `Skip` otherwise. An unknown value throws an `Error` that lists the valid ones.
   */
  get mode(): IntegrationMode {
    const raw = this.env['INTEGRATION_TESTS'];
    if (raw === undefined || raw === '') {
      return this.env['CI'] === 'true'
        ? IntegrationMode.Require
        : IntegrationMode.Skip;
    }
    if (raw === IntegrationMode.Skip) {
      return IntegrationMode.Skip;
    }
    if (raw === IntegrationMode.Require) {
      return IntegrationMode.Require;
    }
    throw new Error(
      `INTEGRATION_TESTS must be one of: ${Object.values(IntegrationMode).join(', ')}`,
    );
  }

  /**
   * Whether containers are registered in the Testcontainers reaper. With `TESTCONTAINERS_RYUK_DISABLED=true`
   * there is no reaper to clean them up, but Testcontainers still takes a file lock shared by all
   * processes and lists the containers before each startup. With many suites in parallel a loaded
   * process does not renew that lock in time, another one considers it expired and the suite fails with "Lock is already
   * released" or hangs. Without a reaper there is nothing to register, so the lock is skipped.
   */
  autoCleanup(): boolean {
    return this.env['TESTCONTAINERS_RYUK_DISABLED'] !== 'true';
  }

  /** Whether there is a container runtime. Queries the probe only once. */
  isAvailable(): boolean {
    this.available ??= this.probe.isRunning();
    return this.available;
  }

  /**
   * `describe` for a suite with containers. With a runtime it runs normally; without
   * a runtime in `Skip` mode it becomes `describe.skip`; in `Require` mode it defines
   * a test that fails with a clear message. It reads the mode before querying
   * the probe, so an invalid `INTEGRATION_TESTS` fails even if there is a runtime.
   */
  describeIfAvailable(name: string, body: () => void): void {
    const mode = this.mode;
    if (this.isAvailable()) {
      this.suites.describe(name, body);
      return;
    }
    if (mode === IntegrationMode.Skip) {
      this.suites.skip(name, body);
      return;
    }
    this.suites.describe(name, () => {
      this.suites.it('needs a container runtime', () => {
        throw new Error(
          'INTEGRATION_TESTS=require but no container runtime is available',
        );
      });
    });
  }
}
