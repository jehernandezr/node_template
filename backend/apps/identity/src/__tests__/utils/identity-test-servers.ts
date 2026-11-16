import type { ConfigEnv } from '@platform/config';
import { ValkeyTestServer } from '@platform/adapters-valkey/test-utils';
import {
  ServiceDatabases,
  ServicePostgresServer,
} from '@platform/service/test-utils';
import { IdentityTestEnvironment } from './identity-test-environment.js';

/** PostgreSQL y Valkey reales para las pruebas de integración de identity. */
export class IdentityTestServers {
  private readonly postgres = new ServicePostgresServer();
  private readonly valkey = new ValkeyTestServer('identity');
  private databases: ServiceDatabases | undefined;

  async start(): Promise<void> {
    await this.postgres.start();
    await this.valkey.start();
    this.databases = await this.postgres.provision();
  }

  /** Entorno de la app: las bases recién creadas y Valkey con el usuario de servicio. */
  environment(): ConfigEnv {
    return IdentityTestEnvironment.build({
      ...this.provisioned().environment('identity'),
      ...this.valkey.environment(),
    });
  }

  /** Anota los dos shards en el directorio del catálogo; el catálogo debe estar migrado. */
  async registerShards(): Promise<void> {
    await this.provisioned().registerShards();
  }

  async stop(): Promise<void> {
    await this.valkey.stop();
    await this.postgres.stop();
  }

  private provisioned(): ServiceDatabases {
    if (this.databases === undefined) {
      throw new Error('IdentityTestServers no está iniciado');
    }
    return this.databases;
  }
}
