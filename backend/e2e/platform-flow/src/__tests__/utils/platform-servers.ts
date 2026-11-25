import type { ConfigEnv } from '@platform/config';
import { ValkeyTestServer } from '@platform/adapters-valkey/test-utils';
import {
  ProvisionedService,
  ServicePostgresServer,
} from '@platform/service/test-utils';
import { PlatformService } from './platform-service.enum.js';

/**
 * One PostgreSQL and one Valkey for the five services, as in an environment: each service with its catalog, its two
 * shards and its role, and all over the same Valkey, where identity writes the access the others read.
 */
export class PlatformServers {
  /** Tasks stores search vectors; the pgvector image serves everyone. */
  private static readonly SHARD_EXTENSIONS: Readonly<
    Partial<Record<PlatformService, readonly string[]>>
  > = { [PlatformService.Tasks]: ['vector'] };

  private readonly postgres = new ServicePostgresServer(
    ServicePostgresServer.PGVECTOR_IMAGE,
  );
  private readonly valkey = new ValkeyTestServer('platform');

  async start(): Promise<void> {
    await this.postgres.start();
    await this.valkey.start();
  }

  provision(service: PlatformService): Promise<ProvisionedService> {
    return ProvisionedService.create(
      this.postgres,
      service,
      PlatformServers.SHARD_EXTENSIONS[service] ?? [],
    );
  }

  /** Valkey with the service prefix, which it takes from `SERVICE_NAME`. */
  valkeyEnvironment(service: PlatformService): ConfigEnv {
    return { ...this.valkey.environment(), SERVICE_NAME: service };
  }

  async stop(): Promise<void> {
    try {
      await this.valkey.stop();
    } finally {
      await this.postgres.stop();
    }
  }
}
