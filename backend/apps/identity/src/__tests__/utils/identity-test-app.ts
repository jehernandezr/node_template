import type { ConfigEnv } from '@platform/config';
import { HttpApplicationSetup } from '@platform/http/nest';
import { HttpTestClient } from '@platform/http/test-utils';
import { MigrationTarget } from '@platform/service';
import { ShardRouter } from '@platform/sharding';
import { InternalOperationsClient } from '@platform/service/test-utils';
import {
  ServiceBootstrap,
  ServiceMigrator,
  type RunningService,
} from '@platform/service/nest';
import { identityService } from '../../identity.service.js';
import { MemoryIdentityMailer } from '../../modules/alerts/index.js';
import { SeedRegionTenants } from '../../modules/tenants/index.js';
import type { IdentityEntry } from './identity-entry.js';
import { IdentityTestServers } from './identity-test-servers.js';
import { PeerServicesStub } from './peer-services-stub.js';
import { ShardProbe } from './shard-probe.js';

/**
 * Full identity on real PostgreSQL and Valkey: migrates the catalog and both shards, seeds the
 * region's tenants and serves HTTP on a free port. The services it calls are `peers`. It is
 * shared by the integration and e2e tests.
 */
export class IdentityTestApp implements IdentityEntry {
  /** Web origin allowed by the test environment. */
  static readonly WEB_ORIGIN = 'https://app.identity.test';
  static readonly DEFAULT_IP = '198.51.100.1';

  readonly peers = new PeerServicesStub();
  private readonly servers = new IdentityTestServers();
  private running: RunningService | undefined;
  private environment: ConfigEnv = {};

  async start(overrides: ConfigEnv = {}): Promise<void> {
    await this.servers.start();
    await this.peers.start();
    // A proxy in front: each test client declares its IP in `X-Forwarded-For`, so the per-IP limit
    // of the public routes is not shared among all tests.
    this.environment = {
      ...this.servers.environment(),
      TRUST_PROXY_HOPS: '1',
      INTERNAL_API_BASE_URLS: JSON.stringify(this.peers.baseUrls()),
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
    try {
      await this.running?.stop();
    } finally {
      try {
        await this.peers.stop();
      } finally {
        await this.servers.stop();
      }
    }
  }

  env(): ConfigEnv {
    return this.environment;
  }

  baseUrl(): string {
    return `http://127.0.0.1:${this.service().address?.port ?? 0}`;
  }

  /** Client without channel headers: the request counts as web. `ip` is the one the proxy declares. */
  client(ip = IdentityTestApp.DEFAULT_IP): HttpTestClient {
    return new HttpTestClient(this.baseUrl(), { 'X-Forwarded-For': ip });
  }

  /** Native app client: the session token travels in the body. */
  nativeClient(ip = IdentityTestApp.DEFAULT_IP): HttpTestClient {
    return this.client(ip).withHeaders({ 'X-Session-Transport': 'bearer' });
  }

  /** Signed client for this app's internal API. */
  internal(): InternalOperationsClient {
    return new InternalOperationsClient(
      'identity',
      this.baseUrl(),
      String(this.environment['INTERNAL_API_SHARED_SECRET']),
    );
  }

  /** What is visible of both shards and the catalog from outside the app. */
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
