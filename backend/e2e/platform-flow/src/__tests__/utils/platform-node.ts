import { HttpTestClient } from '@platform/http/test-utils';
import { OutboxRelay, RelayScopes } from '@platform/messaging';
import type { RunningService } from '@platform/service/nest';
import type {
  ProbeDatabase,
  ProvisionedService,
} from '@platform/service/test-utils';
import type { PlatformService } from './platform-service.enum.js';

/** One of the five running services, with its databases and its URL. */
export class PlatformNode {
  constructor(
    readonly service: PlatformService,
    readonly databases: ProvisionedService,
    private readonly running: RunningService,
  ) {}

  baseUrl(): string {
    return `http://127.0.0.1:${this.running.address?.port ?? 0}`;
  }

  /** Client with a user's access token, as the app calls it. */
  clientOf(accessToken: string): HttpTestClient {
    return new HttpTestClient(this.baseUrl(), {
      Authorization: `Bearer ${accessToken}`,
    });
  }

  get<T>(token: abstract new (...args: never[]) => T): T {
    return this.running.app.get(token, { strict: false });
  }

  /** One relay pass per shard; returns how many outbox records it took. */
  async relayOutbox(): Promise<number> {
    const relay = this.get(OutboxRelay);
    let claimed = 0;
    await this.get(RelayScopes).forEach(async () => {
      claimed += (await relay.relayOnce()).claimed;
    });
    return claimed;
  }

  /** Runs a query in the shard where this service's directory currently places the tenant. */
  async rowsOf<T>(tenantId: string, sql: string): Promise<readonly T[]> {
    return (await this.shardOf(tenantId)).rows<T>(sql);
  }

  /** The tenant's shard according to this service's directory. */
  async shardOf(tenantId: string): Promise<ProbeDatabase> {
    const [placement] = await this.databases.catalog().rows<{
      shard_group: readonly string[];
    }>(`SELECT shard_group FROM shard_directory WHERE tenant_id = '${tenantId}'`);
    const shard = this.databases
      .shards()
      .find((candidate) => candidate.database === placement?.shard_group[0]);
    if (shard === undefined) {
      throw new Error(`${this.service} no tiene al tenant ${tenantId}`);
    }
    return shard;
  }

  stop(): Promise<void> {
    return this.running.stop();
  }
}
