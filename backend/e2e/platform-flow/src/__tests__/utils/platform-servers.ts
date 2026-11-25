import type { ConfigEnv } from '@platform/config';
import { ValkeyTestServer } from '@platform/adapters-valkey/test-utils';
import {
  ProvisionedService,
  ServicePostgresServer,
} from '@platform/service/test-utils';
import { PlatformService } from './platform-service.enum.js';

/**
 * Un PostgreSQL y un Valkey para los cinco servicios, como en un ambiente: cada servicio con su catálogo, sus dos
 * shards y su rol, y todos sobre el mismo Valkey, donde identity escribe el acceso que los demás leen.
 */
export class PlatformServers {
  /** Tasks guarda vectores de búsqueda; la imagen con pgvector sirve a todos. */
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

  /** Valkey con el prefijo del servicio, que lo toma de `SERVICE_NAME`. */
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
