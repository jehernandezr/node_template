import { randomBytes } from 'node:crypto';
import { FeatureFlag, Permission } from '@contracts/identity';
import type { ConfigEnv } from '@platform/config';
import { HttpApplicationSetup } from '@platform/http/nest';
import { HttpTestClient } from '@platform/http/test-utils';
import {
  DispatchOutcome,
  MessageDispatcher,
  OutboxStatus,
} from '@platform/messaging';
import { MigrationTarget } from '@platform/service';
import {
  ServiceBootstrap,
  ServiceMigrator,
  type RunningService,
} from '@platform/service/nest';
import {
  IdentityStub,
  InternalOperationsClient,
  ServiceTestServers,
  type StubMember,
} from '@platform/service/test-utils';
import { reportsService } from '../../reports.service.js';
import { PeerHistoryStub } from './peer-history-stub.js';

/**
 * Full reports over real PostgreSQL and Valkey, with fake identity, tasks and billing and a tenant in each
 * shard. There is no outbox relay: `deliverOutbox` delivers by hand the commands reports sends to itself.
 */
export class ReportsTestApp {
  static readonly TENANT_A = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
  static readonly TENANT_B = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a02';
  static readonly MAX_RESULT_BYTES = 2048;

  readonly servers = new ServiceTestServers('reports');
  readonly identity = new IdentityStub();
  readonly peers = new PeerHistoryStub();
  private readonly internalSecret = randomBytes(32).toString('base64url');
  private running: RunningService | undefined;

  async start(): Promise<void> {
    await this.servers.start();
    await this.identity.start(this.servers.valkey);
    await this.peers.start();
    const identity = this.identity.environment();
    const env: ConfigEnv = {
      ...this.servers.environment(),
      ...identity,
      NODE_ENV: 'test',
      OTEL_SDK_DISABLED: 'true',
      INTERNAL_API_SHARED_SECRET: this.internalSecret,
      INTERNAL_API_BASE_URLS: JSON.stringify({
        ...(JSON.parse(identity['INTERNAL_API_BASE_URLS'] ?? '{}') as object),
        tasks: this.peers.baseUrl(),
        billing: this.peers.baseUrl(),
      }),
      REPORTS_MAX_RESULT_BYTES: String(ReportsTestApp.MAX_RESULT_BYTES),
    };
    const migrator = new ServiceMigrator();
    await migrator.run(reportsService, MigrationTarget.Catalog, { env });
    await this.servers.registerShards();
    await migrator.run(reportsService, MigrationTarget.Shards, { env });
    await this.servers.placeTenant(ReportsTestApp.TENANT_A, 0);
    await this.servers.placeTenant(ReportsTestApp.TENANT_B, 1);
    this.running = await ServiceBootstrap.http(reportsService, {
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
        await Promise.all([this.peers.stop(), this.identity.stop()]);
      } finally {
        await this.servers.stop();
      }
    }
  }

  baseUrl(): string {
    return `http://127.0.0.1:${this.service().address?.port ?? 0}`;
  }

  /** Client of a member who reads and generates reports with the flag on, unless something else is requested. */
  async clientOf(
    member: Partial<StubMember> & { userId: string; tenantId: string },
  ): Promise<HttpTestClient> {
    const token = await this.identity.tokenFor({
      permissions: [Permission.ReportsRead, Permission.ReportsWrite],
      flags: [FeatureFlag.NewReports],
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
      'reports',
      this.baseUrl(),
      this.internalSecret,
    );
  }

  /** Delivers a message as the queue would. */
  deliver(envelope: unknown): Promise<DispatchOutcome> {
    return this.get(MessageDispatcher)
      .dispatch(envelope, { receiveCount: 1 })
      .then((result) => result.outcome);
  }

  /** Delivers the pending messages of a type in the outbox of the tenant's shard and removes them from it. */
  async deliverOutbox(tenantId: string, type: string): Promise<void> {
    const shard = this.shardOf(tenantId);
    const rows = await shard.rows<{ id: string; envelope: unknown }>(
      `SELECT id, envelope FROM outbox WHERE envelope->>'type' = '${type}' AND status = '${OutboxStatus.Pending}' ORDER BY seq`,
    );
    for (const row of rows) {
      await this.deliver(row.envelope);
      await shard.query(`DELETE FROM outbox WHERE id = '${row.id}'`);
    }
  }

  rowsOf<T>(tenantId: string, sql: string): Promise<readonly T[]> {
    return this.shardOf(tenantId).rows<T>(sql);
  }

  get<T>(token: abstract new (...args: never[]) => T): T {
    return this.service().app.get(token, { strict: false });
  }

  private shardOf(tenantId: string) {
    return this.servers.shards()[tenantId === ReportsTestApp.TENANT_A ? 0 : 1];
  }

  private service(): RunningService {
    if (this.running === undefined) {
      throw new Error('ReportsTestApp is not started');
    }
    return this.running;
  }
}
