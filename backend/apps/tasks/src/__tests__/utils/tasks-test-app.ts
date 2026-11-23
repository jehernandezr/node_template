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
 * Tasks completo sobre PostgreSQL con pgvector y Valkey reales: migra el catálogo y los dos shards, ubica un
 * tenant en cada shard y sirve HTTP en un puerto libre. Los tokens los firma `IdentityStub`.
 */
export class TasksTestApp {
  /** Tenant ubicado en el primer shard. */
  static readonly TENANT_A = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
  /** Tenant ubicado en el segundo shard. */
  static readonly TENANT_B = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a02';

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
    const env: ConfigEnv = {
      ...this.servers.environment(),
      ...this.identity.environment(),
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
    await this.running?.stop();
    await this.identity.stop();
    await this.servers.stop();
  }

  baseUrl(): string {
    return `http://127.0.0.1:${this.service().address?.port ?? 0}`;
  }

  /** Cliente de un miembro con permisos de lectura y escritura de tareas, salvo que se pidan otros. */
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
      throw new Error('TasksTestApp no está iniciada');
    }
    return this.running;
  }
}
