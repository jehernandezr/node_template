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
  ServiceTestServers,
  type StubMember,
} from '@platform/service/test-utils';
import { billingService } from '../../billing.service.js';
import { SeedPlans } from '../../modules/plans/index.js';
import { FakePaymentOutcome } from '../../shared/enums/fake-payment-outcome.enum.js';

/**
 * Full billing on real PostgreSQL and Valkey, with the plan catalog seeded and one tenant placed on each
 * shard. The fake charge provider leaves charges pending: the tests resolve them with
 * `mark-paid` and `mark-failed`, as the provider webhook would.
 */
export class BillingTestApp {
  static readonly TENANT_A = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
  static readonly TENANT_B = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a02';
  static readonly TENANT_C = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a03';
  static readonly TENANT_D = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a04';
  static readonly TENANT_E = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a05';
  static readonly TENANT_F = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a06';
  static readonly TENANT_G = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a07';
  static readonly TENANT_H = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a08';
  private static readonly SHARD_OF: Readonly<Record<string, 0 | 1>> = {
    [BillingTestApp.TENANT_A]: 0,
    [BillingTestApp.TENANT_B]: 1,
    [BillingTestApp.TENANT_C]: 0,
    [BillingTestApp.TENANT_D]: 1,
    [BillingTestApp.TENANT_E]: 1,
    [BillingTestApp.TENANT_F]: 0,
    [BillingTestApp.TENANT_G]: 1,
    [BillingTestApp.TENANT_H]: 0,
  };
  static readonly TRIAL_DAYS = 14;
  static readonly GRACE_DAYS = 7;

  readonly servers = new ServiceTestServers('billing');
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
      BILLING_TRIAL_DAYS: String(BillingTestApp.TRIAL_DAYS),
      BILLING_GRACE_DAYS: String(BillingTestApp.GRACE_DAYS),
      BILLING_FAKE_PAYMENT_OUTCOME: FakePaymentOutcome.Pending,
    };
    const migrator = new ServiceMigrator();
    await migrator.run(billingService, MigrationTarget.Catalog, { env });
    await this.servers.registerShards();
    await migrator.run(billingService, MigrationTarget.Shards, { env });
    for (const [tenantId, shard] of Object.entries(BillingTestApp.SHARD_OF)) {
      await this.servers.placeTenant(tenantId, shard);
    }
    this.running = await ServiceBootstrap.http(billingService, {
      env,
      http: {
        port: 0,
        host: '127.0.0.1',
        configurer: new HttpApplicationSetup(),
      },
    });
    await this.get(SeedPlans).execute();
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

  /** Client of a member with the billing permissions, unless others are requested. */
  async clientOf(
    member: Partial<StubMember> & { userId: string; tenantId: string },
  ): Promise<HttpTestClient> {
    const token = await this.identity.tokenFor({
      permissions: [Permission.BillingRead, Permission.BillingWrite],
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
      'billing',
      this.baseUrl(),
      this.internalSecret,
    );
  }

  /** Runs a statement on the tenant shard as the superuser: to move dates and inspect rows. */
  rowsOf<T>(tenantId: string, sql: string): Promise<readonly T[]> {
    const shard = BillingTestApp.SHARD_OF[tenantId] ?? 0;
    return this.servers.shards()[shard].rows<T>(sql);
  }

  get<T>(token: abstract new (...args: never[]) => T): T {
    return this.service().app.get(token, { strict: false });
  }

  private service(): RunningService {
    if (this.running === undefined) {
      throw new Error('BillingTestApp no está iniciada');
    }
    return this.running;
  }
}
