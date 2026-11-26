import { HttpApplicationSetup } from '@platform/http/nest';
import { Permission } from '@contracts/identity';
import type { HttpTestClient } from '@platform/http/test-utils';
import {
  IdentityStub,
  InternalOperationsClient,
  ServicePostgresServer,
  ServiceTestApp,
  ServiceTestServers,
  type StubMember,
} from '@platform/service/test-utils';
import { tasksService } from '../../tasks.service.js';

/**
 * Full tasks over real PostgreSQL with pgvector and Valkey: migrates the catalog and both shards, places a tenant in
 * each shard and serves HTTP on a free port. Tokens are signed by `IdentityStub`.
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
  private readonly app = new ServiceTestApp({
    definition: tasksService,
    servers: this.servers,
    configurer: new HttpApplicationSetup(),
    identity: this.identity,
    tenants: { [TasksTestApp.TENANT_A]: 0, [TasksTestApp.TENANT_B]: 1 },
    peerUrls: () => ({ billing: TasksTestApp.BILLING_URL }),
  });

  /** Starts the databases, identity and tasks. */
  start(): Promise<void> {
    return this.app.start();
  }

  /** Stops tasks, identity and the databases. */
  stop(): Promise<void> {
    return this.app.stop();
  }

  /** The base URL of the tasks HTTP server. */
  baseUrl(): string {
    return this.app.baseUrl();
  }

  /** Client of a member with task read and write permissions, unless others are requested. */
  async clientOf(
    member: Partial<StubMember> & { userId: string; tenantId: string },
  ): Promise<HttpTestClient> {
    return this.app.bearer(
      await this.identity.tokenFor({
        permissions: [Permission.TasksRead, Permission.TasksWrite],
        ...member,
      }),
    );
  }

  /** A client without credentials. */
  anonymous(): HttpTestClient {
    return this.app.client();
  }

  /** A client of the tasks internal API. */
  internal(): InternalOperationsClient {
    return this.app.internal();
  }

  /** A provider of the running application. */
  get<T>(token: abstract new (...args: never[]) => T): T {
    return this.app.get(token);
  }
}
