import { SharedTestServers } from '@platform/kernel/test-utils';
import { ValkeyTestHost } from './valkey-test-host.js';

/** The Valkey the Jest `globalSetup` started for the whole run; it outlives every suite. */
export class SharedValkeyHost extends ValkeyTestHost {
  constructor(private readonly servers = new SharedTestServers(process.env)) {
    super();
  }

  override async start(): Promise<void> {
    this.servers.valkey();
  }

  override async stop(): Promise<void> {}

  override host(): string {
    return this.servers.valkey().host;
  }

  override port(): number {
    return this.servers.valkey().port;
  }
}
