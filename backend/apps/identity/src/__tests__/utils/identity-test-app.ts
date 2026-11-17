import type { ConfigEnv } from '@platform/config';
import { HttpApplicationSetup } from '@platform/http/nest';
import { HttpTestClient } from '@platform/http/test-utils';
import { MigrationTarget } from '@platform/service';
import { ShardRouter } from '@platform/sharding';
import {
  ServiceBootstrap,
  ServiceMigrator,
  type RunningService,
} from '@platform/service/nest';
import { identityService } from '../../identity.service.js';
import { MemoryIdentityMailer } from '../../modules/alerts/index.js';
import { SeedRegionTenants } from '../../modules/tenants/index.js';
import { IdentityTestServers } from './identity-test-servers.js';
import { InternalOperationsClient } from './internal-operations-client.js';
import { ShardProbe } from './shard-probe.js';

/**
 * Identity completo sobre PostgreSQL y Valkey reales: migra el catálogo y los dos shards, siembra los
 * tenants de la región y sirve HTTP en un puerto libre. Lo comparten las pruebas de integración y las e2e.
 */
export class IdentityTestApp {
  /** Origen web permitido por el entorno de prueba. */
  static readonly WEB_ORIGIN = 'https://app.identity.test';
  static readonly DEFAULT_IP = '198.51.100.1';

  private readonly servers = new IdentityTestServers();
  private running: RunningService | undefined;
  private environment: ConfigEnv = {};

  async start(overrides: ConfigEnv = {}): Promise<void> {
    await this.servers.start();
    // Un proxy delante: cada cliente de prueba declara su IP en `X-Forwarded-For`, así el límite por IP
    // de las rutas públicas no se reparte entre todas las pruebas.
    this.environment = {
      ...this.servers.environment(),
      TRUST_PROXY_HOPS: '1',
      ...overrides,
    };
    const migrator = new ServiceMigrator();
    await migrator.run(identityService, MigrationTarget.Catalog, {
      env: this.environment,
    });
    await this.servers.registerShards();
    await migrator.run(identityService, MigrationTarget.Shards, {
      env: this.environment,
    });
    this.running = await ServiceBootstrap.http(identityService, {
      env: this.environment,
      http: {
        port: 0,
        host: '127.0.0.1',
        configurer: new HttpApplicationSetup(),
      },
    });
    await this.running.app.get(SeedRegionTenants).execute();
  }

  async stop(): Promise<void> {
    await this.running?.stop();
    await this.servers.stop();
  }

  env(): ConfigEnv {
    return this.environment;
  }

  baseUrl(): string {
    return `http://127.0.0.1:${this.service().address?.port ?? 0}`;
  }

  /** Cliente sin headers de canal: la petición cuenta como web. `ip` es la que el proxy declara. */
  client(ip = IdentityTestApp.DEFAULT_IP): HttpTestClient {
    return new HttpTestClient(this.baseUrl(), { 'X-Forwarded-For': ip });
  }

  /** Cliente de la app nativa: el session token viaja en el cuerpo. */
  nativeClient(ip = IdentityTestApp.DEFAULT_IP): HttpTestClient {
    return this.client(ip).withHeaders({ 'X-Session-Transport': 'bearer' });
  }

  /** Cliente firmado de la API interna de esta app. */
  internal(): InternalOperationsClient {
    return new InternalOperationsClient(
      this.baseUrl(),
      String(this.environment['INTERNAL_API_SHARED_SECRET']),
    );
  }

  /** Lo que se ve de los dos shards y el catálogo desde fuera de la app. */
  shards(): ShardProbe {
    return new ShardProbe(this.servers, this.get(ShardRouter));
  }

  mailer(): MemoryIdentityMailer {
    return this.service().app.get(MemoryIdentityMailer);
  }

  get<T>(token: abstract new (...args: never[]) => T): T {
    return this.service().app.get(token, { strict: false });
  }

  service(): RunningService {
    if (this.running === undefined) {
      throw new Error('IdentityTestApp no está iniciada');
    }
    return this.running;
  }
}
