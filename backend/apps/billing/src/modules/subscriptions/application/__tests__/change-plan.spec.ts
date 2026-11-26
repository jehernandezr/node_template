import {
  BillingErrorCode,
  SubscriptionChangedEvent,
  UsageMetric,
} from '@contracts/billing';
import {
  CatalogPlans,
  SubscriptionsHarness,
} from '../../__tests__/utils/index.js';

const DAY_MS = 86_400_000;
const TENANT = SubscriptionsHarness.TENANT;

describe('ChangePlan', () => {
  it('moves an active subscription to a dearer plan and accumulates the difference for the rest of the period', async () => {
    const harness = new SubscriptionsHarness();
    await harness.seedActive(CatalogPlans.BASIC);
    harness.clock.advance(10 * DAY_MS);

    const changed = await harness
      .changePlan()
      .execute(TENANT, CatalogPlans.PRO.id);

    expect(changed.subscription.planId).toBe(CatalogPlans.PRO.id);
    expect(changed.subscription.prorationMinor).toBeGreaterThan(0);
    expect(harness.bus.types()[0]).toBe(SubscriptionChangedEvent.type);
  });

  it('refuses a plan whose limit the usage of the period already exceeds, and changes nothing', async () => {
    const harness = new SubscriptionsHarness();
    await harness.seedActive(CatalogPlans.PRO);
    harness.usage.levelsOfPeriod = [{ metric: UsageMetric.Users, used: 12 }];

    await expect(
      harness.changePlan().execute(TENANT, CatalogPlans.BASIC.id),
    ).rejects.toMatchObject({ code: BillingErrorCode.PlanUsageExceedsLimit });

    expect(harness.subscriptions.current()?.snapshot().planId).toBe(
      CatalogPlans.PRO.id,
    );
    expect(harness.bus.types()).toEqual([]);
  });

  it('refuses to change the plan of a suspended subscription', async () => {
    const harness = new SubscriptionsHarness();
    await harness.seedActive(CatalogPlans.BASIC);
    await harness.standing().markPastDue(TENANT);
    harness.clock.advance((SubscriptionsHarness.GRACE_DAYS + 1) * DAY_MS);
    await harness.standing().suspendIfOverdue(TENANT);

    await expect(
      harness.changePlan().execute(TENANT, CatalogPlans.PRO.id),
    ).rejects.toMatchObject({
      code: BillingErrorCode.SubscriptionNotChangeable,
    });
  });

  it('reports a tenant without a subscription', async () => {
    const harness = new SubscriptionsHarness();

    await expect(
      harness.changePlan().execute(TENANT, CatalogPlans.PRO.id),
    ).rejects.toMatchObject({ code: BillingErrorCode.SubscriptionNotFound });
  });
});
