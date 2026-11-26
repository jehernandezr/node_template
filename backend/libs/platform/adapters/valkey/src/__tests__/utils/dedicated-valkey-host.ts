import { ContainerRuntime } from '@platform/kernel/test-utils';
import {
  GenericContainer,
  Wait,
  type StartedTestContainer,
} from 'testcontainers';
import { ValkeyTestHost } from './valkey-test-host.js';

/**
 * A Valkey container of its own, for a test that needs two servers that do not see each other, such as two
 * regions. Everything else shares the run's Valkey.
 */
export class DedicatedValkeyHost extends ValkeyTestHost {
  static readonly IMAGE = 'valkey/valkey-bundle:8.1';

  private container: StartedTestContainer | undefined;

  override async start(): Promise<void> {
    this.container = await new GenericContainer(DedicatedValkeyHost.IMAGE)
      .withAutoCleanup(new ContainerRuntime(process.env).autoCleanup())
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
      .start();
  }

  override async stop(): Promise<void> {
    await this.container?.stop();
  }

  override host(): string {
    return this.started().getHost();
  }

  override port(): number {
    return this.started().getMappedPort(6379);
  }

  private started(): StartedTestContainer {
    if (this.container === undefined) {
      throw new Error('the server is not started');
    }
    return this.container;
  }
}
