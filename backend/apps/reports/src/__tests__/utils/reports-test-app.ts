import { HttpApplicationSetup } from '@platform/http/nest';
import { FeatureFlag, Permission } from '@contracts/identity';
import type { HttpTestClient } from '@platform/http/test-utils';
import {
  DispatchOutcome,
  MessageDispatcher,
  OutboxStatus,
} from '@platform/messaging';
import {
  IdentityStub,
  InternalOperationsClient,
  ServiceTestApp,
  ServiceTestServers,
  type StubMember,
} from '@platform/service/test-utils';
import { reportsService } from '../../reports.service.js';
import { PeerHistoryStub } from './peer-history-stub.js';

/**
 * Full reports over real PostgreSQL and Valkey, with fake identity, tasks and billing and a tenant in each shard. There
 * is no outbox relay: `deliverOutbox` delivers by hand the commands reports sends to itself.
 */
export class ReportsTestApp {
  static readonly TENANT_A = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
  static readonly TENANT_B = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a02';
  static readonly MAX_RESULT_BYTES = 2048;

  readonly servers = new ServiceTestServers('reports');
  readonly identity = new IdentityStub();
  readonly peers = new PeerHistoryStub();
  private readonly app = new ServiceTestApp({
    definition: reportsService,
    servers: this.servers,
    configurer: new HttpApplicationSetup(),
    identity: this.identity,
    peers: [this.peers],
    tenants: { [ReportsTestApp.TENANT_A]: 0, [ReportsTestApp.TENANT_B]: 1 },
    peerUrls: () => ({
      tasks: this.peers.baseUrl(),
      billing: this.peers.baseUrl(),
    }),
    environment: () => ({
      REPORTS_MAX_RESULT_BYTES: String(ReportsTestApp.MAX_RESULT_BYTES),
    }),
  });

  /** Starts the databases, identity, the peer stub and reports. */
  start(): Promise<void> {
    return this.app.start();
  }

  /** Stops reports, the peer stub, identity and the databases. */
  stop(): Promise<void> {
    return this.app.stop();
  }

  /** The base URL of the reports HTTP server. */
  baseUrl(): string {
    return this.app.baseUrl();
  }

  /** Client of a member who reads and generates reports with the flag on, unless something else is requested. */
  async clientOf(
    member: Partial<StubMember> & { userId: string; tenantId: string },
  ): Promise<HttpTestClient> {
    return this.app.bearer(
      await this.identity.tokenFor({
        permissions: [Permission.ReportsRead, Permission.ReportsWrite],
        flags: [FeatureFlag.NewReports],
        ...member,
      }),
    );
  }

  /** A client without credentials. */
  anonymous(): HttpTestClient {
    return this.app.client();
  }

  /** A client of the reports internal API. */
  internal(): InternalOperationsClient {
    return this.app.internal();
  }

  /** Delivers a message as the queue would. */
  deliver(envelope: unknown): Promise<DispatchOutcome> {
    return this.get(MessageDispatcher)
      .dispatch(envelope, { receiveCount: 1 })
      .then((result) => result.outcome);
  }

  /** Delivers the pending messages of a type in the outbox of the tenant's shard and removes them from it. */
  async deliverOutbox(tenantId: string, type: string): Promise<void> {
    const shard = this.app.shardOf(tenantId);
    const rows = await shard.rows<{ id: string; envelope: unknown }>(
      `SELECT id, envelope FROM outbox WHERE envelope->>'type' = '${type}' AND status = '${OutboxStatus.Pending}' ORDER BY seq`,
    );
    for (const row of rows) {
      await this.deliver(row.envelope);
      await shard.query(`DELETE FROM outbox WHERE id = '${row.id}'`);
    }
  }

  /** Runs a statement on the tenant's shard as the superuser. */
  rowsOf<T>(tenantId: string, sql: string): Promise<readonly T[]> {
    return this.app.rowsOf<T>(tenantId, sql);
  }

  /** A provider of the running application. */
  get<T>(token: abstract new (...args: never[]) => T): T {
    return this.app.get(token);
  }
}
