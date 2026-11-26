import {
  EntitlementsChangedEvent,
  SubscriptionChangedEvent,
  SubscriptionStatus,
} from '@contracts/billing';
import {
  CatalogPlans,
  SubscriptionsHarness,
} from '../../__tests__/utils/index.js';

const TENANT = SubscriptionsHarness.TENANT;

describe('OpenSubscription', () => {
  it('opens the trial plan for the configured trial days and announces it', async () => {
    const harness = new SubscriptionsHarness();

    const opened = await harness.open().execute(TENANT);

    expect(opened.subscription).toMatchObject({
      planId: CatalogPlans.TRIAL.id,
      status: SubscriptionStatus.Trialing,
    });
    expect(opened.subscription.period.days()).toBe(
      SubscriptionsHarness.TRIAL_DAYS,
    );
    expect(harness.bus.types()).toEqual([
      SubscriptionChangedEvent.type,
      EntitlementsChangedEvent.type,
    ]);
    expect(harness.bus.messages[0]?.data).toMatchObject({
      previousPlanId: null,
      planId: CatalogPlans.TRIAL.id,
    });
  });

  it('returns the subscription it already opened when the saga asks again', async () => {
    const harness = new SubscriptionsHarness();
    const first = await harness.open().execute(TENANT);

    const second = await harness.open().execute(TENANT);

    expect(second.subscription).toEqual(first.subscription);
    expect(harness.bus.types()).toHaveLength(2);
  });
});
