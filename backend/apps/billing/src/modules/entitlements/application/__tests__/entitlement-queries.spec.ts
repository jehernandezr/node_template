import {
  BillingErrorCode,
  SubscriptionStatus,
  UsageMetric,
} from '@contracts/billing';
import { CatalogPlans } from '../../../../__tests__/utils/catalog-plans.js';
import { SubscriptionsHarness } from '../../../../__tests__/utils/subscriptions-harness.js';
import { EntitlementQueries } from '../entitlement-queries.js';

const TENANT = SubscriptionsHarness.TENANT;

class EntitlementsHarness extends SubscriptionsHarness {
  queries(): EntitlementQueries {
    return new EntitlementQueries(this.facade(), this.usage);
  }

  async suspend(): Promise<void> {
    const subscription = this.subscriptions.current();
    subscription?.markPastDue(this.clock.now());
    subscription?.suspendIfOverdue(new Date('2026-12-31T00:00:00.000Z'), 7);
    if (subscription !== undefined) {
      await this.subscriptions.update(subscription);
    }
  }
}

describe('EntitlementQueries', () => {
  it('allows consuming within the plan limit and refuses what goes past it', async () => {
    const harness = new EntitlementsHarness();
    await harness.seedActive(CatalogPlans.BASIC);
    harness.usage.levelsOfPeriod = [{ metric: UsageMetric.Users, used: 4 }];

    await expect(
      harness.queries().check(TENANT, UsageMetric.Users),
    ).resolves.toEqual({
      metric: UsageMetric.Users,
      limit: 5,
      used: 4,
      allowed: true,
    });
    await expect(
      harness.queries().check(TENANT, UsageMetric.Users, 2),
    ).resolves.toMatchObject({ allowed: false });
  });

  it('puts no cap on a metric the plan does not limit', async () => {
    const harness = new EntitlementsHarness();
    await harness.seedActive(CatalogPlans.BASIC);
    harness.usage.levelsOfPeriod = [
      { metric: UsageMetric.ApiCalls, used: 1_000_000 },
    ];

    await expect(
      harness.queries().check(TENANT, UsageMetric.ApiCalls, 500),
    ).resolves.toMatchObject({
      limit: Number.MAX_SAFE_INTEGER,
      allowed: true,
    });
  });

  it('allows no consumption to a suspended tenant and takes its features away', async () => {
    const harness = new EntitlementsHarness();
    await harness.seedActive(CatalogPlans.BASIC);
    await harness.suspend();

    await expect(
      harness.queries().check(TENANT, UsageMetric.Users),
    ).resolves.toMatchObject({ used: 0, allowed: false });
    await expect(harness.queries().snapshot(TENANT)).resolves.toEqual({
      tenantId: TENANT,
      status: SubscriptionStatus.Suspended,
      features: [],
      quotas: [{ metric: UsageMetric.Users, limit: 5 }],
    });
  });

  it('shows the usage of the period against every quota of the plan', async () => {
    const harness = new EntitlementsHarness();
    await harness.seedActive(CatalogPlans.PRO);
    harness.usage.levelsOfPeriod = [{ metric: UsageMetric.Users, used: 12 }];

    await expect(harness.queries().overview(TENANT)).resolves.toEqual({
      items: [{ metric: UsageMetric.Users, limit: 50, used: 12 }],
    });
  });

  it('reports a tenant without a subscription', async () => {
    const harness = new EntitlementsHarness();

    await expect(harness.queries().snapshot(TENANT)).rejects.toMatchObject({
      code: BillingErrorCode.SubscriptionNotFound,
    });
  });
});
