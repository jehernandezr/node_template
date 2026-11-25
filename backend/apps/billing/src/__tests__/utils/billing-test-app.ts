import { HttpApplicationSetup } from '@platform/http/nest';
import { Permission } from '@contracts/identity';
import type { HttpTestClient } from '@platform/http/test-utils';
import {
  IdentityStub,
  InternalOperationsClient,
  ServiceTestApp,
  ServiceTestServers,
  type StubMember,
} from '@platform/service/test-utils';
import { billingService } from '../../billing.service.js';
import { SeedPlans } from '../../modules/plans/index.js';
import { FakePaymentOutcome } from '../../shared/enums/fake-payment-outcome.enum.js';

/**
 * Full billing on real PostgreSQL and Valkey, with the plan catalog seeded and tenants placed on both shards. The fake
 * charge provider leaves charges pending: the tests resolve them with `mark-paid` and `mark-failed`, as the provider
 * webhook would.
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
  static readonly TRIAL_DAYS = 14;
  static readonly GRACE_DAYS = 7;

  readonly servers = new ServiceTestServers('billing');
  readonly identity = new IdentityStub();
  private readonly app = new ServiceTestApp({
    definition: billingService,
    servers: this.servers,
    configurer: new HttpApplicationSetup(),
    identity: this.identity,
    tenants: {
      [BillingTestApp.TENANT_A]: 0,
      [BillingTestApp.TENANT_B]: 1,
      [BillingTestApp.TENANT_C]: 0,
      [BillingTestApp.TENANT_D]: 1,
      [BillingTestApp.TENANT_E]: 1,
      [BillingTestApp.TENANT_F]: 0,
      [BillingTestApp.TENANT_G]: 1,
      [BillingTestApp.TENANT_H]: 0,
    },
    environment: () => ({
      BILLING_TRIAL_DAYS: String(BillingTestApp.TRIAL_DAYS),
      BILLING_GRACE_DAYS: String(BillingTestApp.GRACE_DAYS),
      BILLING_FAKE_PAYMENT_OUTCOME: FakePaymentOutcome.Pending,
    }),
  });

  /** Starts the databases, identity and billing, and seeds the plan catalog. */
  async start(): Promise<void> {
    await this.app.start();
    await this.get(SeedPlans).execute();
  }

  /** Stops billing, identity and the databases. */
  stop(): Promise<void> {
    return this.app.stop();
  }

  /** The base URL of the billing HTTP server. */
  baseUrl(): string {
    return this.app.baseUrl();
  }

  /** Client of a member with the billing permissions, unless others are requested. */
  async clientOf(
    member: Partial<StubMember> & { userId: string; tenantId: string },
  ): Promise<HttpTestClient> {
    return this.app.bearer(
      await this.identity.tokenFor({
        permissions: [Permission.BillingRead, Permission.BillingWrite],
        ...member,
      }),
    );
  }

  /** A client without credentials. */
  anonymous(): HttpTestClient {
    return this.app.client();
  }

  /** A client of the billing internal API. */
  internal(): InternalOperationsClient {
    return this.app.internal();
  }

  /** Runs a statement on the tenant shard as the superuser: to move dates and inspect rows. */
  rowsOf<T>(tenantId: string, sql: string): Promise<readonly T[]> {
    return this.app.rowsOf<T>(tenantId, sql);
  }

  /** A provider of the running application. */
  get<T>(token: abstract new (...args: never[]) => T): T {
    return this.app.get(token);
  }
}
