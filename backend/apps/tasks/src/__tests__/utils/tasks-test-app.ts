import { randomBytes } from 'node:crypto';
import { Permission } from '@contracts/identity';
import type { ConfigEnv } from '@platform/config';
import { HttpApplicationSetup } from '@platform/http/nest';
import { HttpTestClient } from '@platform/http/test-utils';
import { MigrationTarget } from '@platform/service';
import {
  ServiceBootstrap,
  ServiceMigrator,
  type RunningService,
} from '@platform/service/nest';
import {
  IdentityStub,
  InternalOperationsClient,
  ServicePostgresServer,
  ServiceTestServers,
  type StubMember,
} from '@platform/service/test-utils';
import { tasksService } from '../../tasks.service.js';

/**
 * Full tasks over real PostgreSQL with pgvector and Valkey: migrates the catalog and both shards, places a
 * tenant in each shard and serves HTTP on a free port. Tokens are signed by `IdentityStub`.
 */
export class TasksTestApp {
  /** Tenant located on the first shard. */
  static readonly TENANT_A = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
  /** Tenant located on the second shard. */
  static readonly TENANT_B = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a02';
  /** Billing only answers service account quotas, and the tests call as people: nobody queries it. */
  private static readonly BILLING_URL = 'http://billing.test';

  readonly servers = new ServiceTestServers(
    'tasks',
    ServicePostgresServer.PGVECTOR_IMAGE,
    ['vector'],
  );
  readonly identity = new IdentityStub();
  private readonly internalSecret = randomBytes(32).toString('base64url');
  private running: RunningService | undefined;

  async start(): Promise<void> {
    await this.servers.start();
    await this.identity.start(this.servers.valkey);
    const identityEnv = this.identity.environment();
    const env: ConfigEnv = {
      ...this.servers.environment(),
      ...identityEnv,
      INTERNAL_API_BASE_URLS: JSON.stringify({
        ...(JSON.parse(
          identityEnv['INTERNAL_API_BASE_URLS'] ?? '{}',
        ) as object),
        billing: TasksTestApp.BILLING_URL,
      }),
      NODE_ENV: 'test',
      OTEL_SDK_DISABLED: 'true',
      INTERNAL_API_SHARED_SECRET: this.internalSecret,
    };
    const migrator = new ServiceMigrator();
    await migrator.run(tasksService, MigrationTarget.Catalog, { env });
    await this.servers.registerShards();
    await migrator.run(tasksService, MigrationTarget.Shards, { env });
    await this.servers.placeTenant(TasksTestApp.TENANT_A, 0);
    await this.servers.placeTenant(TasksTestApp.TENANT_B, 1);
    this.running = await ServiceBootstrap.http(tasksService, {
      env,
      http: {
        port: 0,
        host: '127.0.0.1',
        configurer: new HttpApplicationSetup(),
      },
    });
  }

  async stop(): Promise<void> {
    try {
      await this.running?.stop();
    } finally {
      try {
        await this.identity.stop();
      } finally {
        await this.servers.stop();
      }
    }
  }

  baseUrl(): string {
    return `http://127.0.0.1:${this.service().address?.port ?? 0}`;
  }

  /** Client of a member with task read and write permissions, unless others are requested. */
  async clientOf(
    member: Partial<StubMember> & { userId: string; tenantId: string },
  ): Promise<HttpTestClient> {
    const token = await this.identity.tokenFor({
      permissions: [Permission.TasksRead, Permission.TasksWrite],
      ...member,
    });
    return new HttpTestClient(this.baseUrl(), {
      Authorization: `Bearer ${token}`,
    });
  }

  anonymous(): HttpTestClient {
    return new HttpTestClient(this.baseUrl());
  }

  internal(): InternalOperationsClient {
    return new InternalOperationsClient(
      'tasks',
      this.baseUrl(),
      this.internalSecret,
    );
  }

  get<T>(token: abstract new (...args: never[]) => T): T {
    return this.service().app.get(token, { strict: false });
  }

  private service(): RunningService {
    if (this.running === undefined) {
      throw new Error('TasksTestApp is not started');
    }
    return this.running;
  }
}
