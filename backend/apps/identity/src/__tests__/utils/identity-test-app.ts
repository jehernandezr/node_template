import { HttpApplicationSetup } from '@platform/http/nest';
import type { ConfigEnv } from '@platform/config';
import type { HttpTestClient } from '@platform/http/test-utils';
import { ShardRouter } from '@platform/sharding';
import {
  InternalOperationsClient,
  ServiceTestApp,
} from '@platform/service/test-utils';
import type { RunningService } from '@platform/service/nest';
import { identityService } from '../../identity.service.js';
import { MemoryIdentityMailer } from '../../modules/alerts/index.js';
import { SeedRegionTenants } from '../../modules/tenants/index.js';
import type { IdentityEntry } from './identity-entry.js';
import { IdentityTestServers } from './identity-test-servers.js';
import { PeerServicesStub } from './peer-services-stub.js';
import { ShardProbe } from './shard-probe.js';

/**
 * Full identity on real PostgreSQL and Valkey: migrates the catalog and both shards, seeds the region's tenants and
 * serves HTTP on a free port. The services it calls are `peers`. It is shared by the integration and e2e tests.
 * A proxy sits in front: each test client declares its IP in `X-Forwarded-For`, so the per-IP limit of the public
 * routes is not shared among all tests.
 */
export class IdentityTestApp implements IdentityEntry {
  /** Web origin allowed by the test environment. */
  static readonly WEB_ORIGIN = 'https://app.identity.test';
  static readonly DEFAULT_IP = '198.51.100.1';

  readonly peers = new PeerServicesStub();
  private readonly servers = new IdentityTestServers();
  private readonly app = new ServiceTestApp({
    definition: identityService,
    servers: this.servers,
    configurer: new HttpApplicationSetup(),
    peers: [this.peers],
    peerUrls: () => this.peers.baseUrls(),
    environment: () => ({ TRUST_PROXY_HOPS: '1' }),
  });

  /** Starts the databases, the peer stubs and identity, and seeds the region's tenants. */
  async start(overrides: ConfigEnv = {}): Promise<void> {
    await this.app.start(overrides);
    await this.get(SeedRegionTenants).execute();
  }

  /** Stops identity, the peer stubs and the databases. */
  stop(): Promise<void> {
    return this.app.stop();
  }

  /** The environment identity started with. */
  env(): ConfigEnv {
    return this.app.environment();
  }

  /** Where the Valkey of the test listens, for a proxy that takes it down. */
  valkeyAddress(): { readonly host: string; readonly port: number } {
    return { host: this.servers.valkey.host, port: this.servers.valkey.port };
  }

  /** The base URL of the identity HTTP server. */
  baseUrl(): string {
    return this.app.baseUrl();
  }

  /** Client without channel headers: the request counts as web. `ip` is the one the proxy declares. */
  client(ip = IdentityTestApp.DEFAULT_IP): HttpTestClient {
    return this.app.client({ 'X-Forwarded-For': ip });
  }

  /** Native app client: the session token travels in the body. */
  nativeClient(ip = IdentityTestApp.DEFAULT_IP): HttpTestClient {
    return this.client(ip).withHeaders({ 'X-Session-Transport': 'bearer' });
  }

  /** Signed client for this app's internal API. */
  internal(): InternalOperationsClient {
    return this.app.internal();
  }

  /** What is visible of both shards and the catalog from outside the app. */
  shards(): ShardProbe {
    return new ShardProbe(this.servers, this.get(ShardRouter));
  }

  /** The mailer that keeps identity's email in memory. */
  mailer(): MemoryIdentityMailer {
    return this.get(MemoryIdentityMailer);
  }

  /** A provider of the running application. */
  get<T>(token: abstract new (...args: never[]) => T): T {
    return this.app.get(token);
  }

  /** The running service. */
  service(): RunningService {
    return this.app.service();
  }
}
