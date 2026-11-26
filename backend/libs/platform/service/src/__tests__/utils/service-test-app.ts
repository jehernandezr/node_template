import { randomBytes } from 'node:crypto';
import type { ConfigEnv } from '@platform/config';
import { HttpTestClient } from '@platform/http/test-utils';
import { MigrationTarget } from '../../migration-target.enum.js';
import { ServiceBootstrap } from '../../nest/bootstrap/service-bootstrap.js';
import type { RunningService } from '../../nest/bootstrap/running-service.js';
import { ServiceMigrator } from '../../nest/bootstrap/service-migrator.js';
import { InternalOperationsClient } from './internal-operations-client.js';
import type { ProbeDatabase } from './probe-database.js';
import type { ServiceTestAppOptions } from './service-test-app-options.js';
import type { TestServer } from './test-server.js';

/**
 * A whole service over real PostgreSQL and Valkey for integration and end-to-end tests: it starts the databases and the
 * stubs, migrates the catalog and both shards (cloned from templates migrated once per run), places the tenants and
 * serves HTTP on a free port. Each service's test
 * app composes one and adds what is its own, such as the default permissions of its clients.
 */
export class ServiceTestApp {
  private static readonly HOST = '127.0.0.1';
  private running: RunningService | undefined;
  private env: ConfigEnv = {};

  constructor(private readonly options: ServiceTestAppOptions) {}

  /** Starts everything; `overrides` replace any variable of the environment it builds. */
  async start(overrides: ConfigEnv = {}): Promise<void> {
    const { definition, servers, identity } = this.options;
    await servers.start();
    await identity?.start(servers.valkey);
    for (const peer of this.options.peers ?? []) {
      await peer.start();
    }
    this.env = { ...this.buildEnvironment(), ...overrides };
    const migrator = new ServiceMigrator();
    await servers.migrateFromTemplates(
      {
        catalog: definition.migrations.catalog.migrations,
        shard: definition.migrations.shard.migrations,
      },
      async (databases, registerShards) => {
        const env = { ...this.env, ...databases };
        await migrator.run(definition, MigrationTarget.Catalog, { env });
        await registerShards();
        await migrator.run(definition, MigrationTarget.Shards, { env });
      },
    );
    await servers.registerShards();
    for (const [tenantId, shard] of Object.entries(
      this.options.tenants ?? {},
    )) {
      await servers.placeTenant(tenantId, shard);
    }
    this.running = await ServiceBootstrap.http(definition, {
      env: this.env,
      http: {
        port: 0,
        host: ServiceTestApp.HOST,
        configurer: this.options.configurer,
      },
    });
  }

  /** Stops the service, then the stubs in reverse order, then identity and the databases, even if one of them fails. */
  async stop(): Promise<void> {
    try {
      await this.running?.stop();
    } finally {
      try {
        await this.stopPeers([...(this.options.peers ?? [])].reverse());
      } finally {
        try {
          await this.options.identity?.stop();
        } finally {
          await this.options.servers.stop();
        }
      }
    }
  }

  /** The environment the service started with. */
  environment(): ConfigEnv {
    return this.env;
  }

  /** The base URL of the service's HTTP server. */
  baseUrl(): string {
    return `http://${ServiceTestApp.HOST}:${this.service().address?.port ?? 0}`;
  }

  /** A client of the service's HTTP API with the given headers. */
  client(headers: Readonly<Record<string, string>> = {}): HttpTestClient {
    return new HttpTestClient(this.baseUrl(), { ...headers });
  }

  /** A client that authenticates with the given access token. */
  bearer(token: string): HttpTestClient {
    return this.client({ Authorization: `Bearer ${token}` });
  }

  /** A client of the service's internal API, signed with the secret of its environment. */
  internal(): InternalOperationsClient {
    return new InternalOperationsClient(
      this.options.definition.name,
      this.baseUrl(),
      String(this.env['INTERNAL_API_SHARED_SECRET']),
    );
  }

  /** The shard where the tenant was placed, with the superuser connection; the first shard if it was not placed. */
  shardOf(tenantId: string): ProbeDatabase {
    return this.options.servers.shards()[this.options.tenants?.[tenantId] ?? 0];
  }

  /** Runs a statement on the tenant's shard as the superuser: to move dates and inspect rows. */
  rowsOf<T>(tenantId: string, sql: string): Promise<readonly T[]> {
    return this.shardOf(tenantId).rows<T>(sql);
  }

  /** A provider of the running application. */
  get<T>(token: abstract new (...args: never[]) => T): T {
    return this.service().app.get(token, { strict: false });
  }

  /**
   * The running service.
   * @throws Error if the app is not started.
   */
  service(): RunningService {
    if (this.running === undefined) {
      throw new Error(
        `${this.options.definition.name} test app is not started`,
      );
    }
    return this.running;
  }

  private buildEnvironment(): ConfigEnv {
    const identity = this.options.identity?.environment() ?? {};
    const baseUrls = {
      ...(JSON.parse(identity['INTERNAL_API_BASE_URLS'] ?? '{}') as object),
      ...this.options.peerUrls?.(),
    };
    return {
      NODE_ENV: 'test',
      OTEL_SDK_DISABLED: 'true',
      INTERNAL_API_SHARED_SECRET: randomBytes(32).toString('base64url'),
      ...this.options.servers.environment(),
      ...identity,
      ...(Object.keys(baseUrls).length === 0
        ? {}
        : { INTERNAL_API_BASE_URLS: JSON.stringify(baseUrls) }),
      ...this.options.environment?.(),
    };
  }

  private async stopPeers(peers: readonly TestServer[]): Promise<void> {
    const [first, ...rest] = peers;
    if (first === undefined) {
      return;
    }
    try {
      await first.stop();
    } finally {
      await this.stopPeers(rest);
    }
  }
}
