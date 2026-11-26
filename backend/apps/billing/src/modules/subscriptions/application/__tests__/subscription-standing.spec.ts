import {
  EntitlementsChangedEvent,
  SubscriptionReactivatedEvent,
  SubscriptionStatus,
  SubscriptionSuspendedEvent,
} from '@contracts/billing';
import { SubscriptionsHarness } from '../../__tests__/utils/index.js';

const DAY_MS = 86_400_000;
const TENANT = SubscriptionsHarness.TENANT;

describe('SubscriptionStanding', () => {
  it('marks an active subscription past due when a charge fails, without telling anyone yet', async () => {
    const harness = new SubscriptionsHarness();
    await harness.seedActive();

    await harness.standing().markPastDue(TENANT);

    expect(harness.subscriptions.current()?.snapshot()).toMatchObject({
      status: SubscriptionStatus.PastDue,
      pastDueSince: harness.clock.now(),
    });
    expect(harness.bus.types()).toEqual([]);
  });

  it('keeps a past-due subscription usable until its grace days end', async () => {
    const harness = new SubscriptionsHarness();
    await harness.seedActive();
    await harness.standing().markPastDue(TENANT);
    harness.clock.advance((SubscriptionsHarness.GRACE_DAYS - 1) * DAY_MS);

    await harness.standing().suspendIfOverdue(TENANT);

    expect(harness.subscriptions.current()?.snapshot().status).toBe(
      SubscriptionStatus.PastDue,
    );
    expect(harness.bus.types()).toEqual([]);
  });

  it('suspends a past-due subscription once its grace days end and withdraws its plan features', async () => {
    const harness = new SubscriptionsHarness();
    await harness.seedActive();
    await harness.standing().markPastDue(TENANT);
    harness.clock.advance(SubscriptionsHarness.GRACE_DAYS * DAY_MS + 1);

    await harness.standing().suspendIfOverdue(TENANT);

    expect(harness.subscriptions.current()?.snapshot().status).toBe(
      SubscriptionStatus.Suspended,
    );
    expect(harness.bus.types()).toEqual([
      SubscriptionSuspendedEvent.type,
      EntitlementsChangedEvent.type,
    ]);
  });

  it('reactivates a suspended subscription with a new period that starts on the day it is paid', async () => {
    const harness = new SubscriptionsHarness();
    await harness.seedActive();
    await harness.standing().markPastDue(TENANT);
    harness.clock.advance(SubscriptionsHarness.GRACE_DAYS * DAY_MS + 1);
    await harness.standing().suspendIfOverdue(TENANT);
    harness.clock.advance(90 * DAY_MS);

    await harness.standing().settle(TENANT);

    const state = harness.subscriptions.current()?.snapshot();
    expect(state?.status).toBe(SubscriptionStatus.Active);
    expect(state?.period.start).toBe('2027-02-06');
    expect(state?.pastDueSince).toBeUndefined();
    expect(harness.bus.types().slice(-2)).toEqual([
      SubscriptionReactivatedEvent.type,
      EntitlementsChangedEvent.type,
    ]);
  });

  it('settles a past-due subscription in its own period, because it kept using the plan', async () => {
    const harness = new SubscriptionsHarness();
    await harness.seedActive();
    const period = harness.subscriptions.current()?.snapshot().period;
    await harness.standing().markPastDue(TENANT);
    harness.clock.advance(3 * DAY_MS);

    await harness.standing().settle(TENANT);

    expect(harness.subscriptions.current()?.snapshot()).toMatchObject({
      status: SubscriptionStatus.Active,
      period,
    });
    expect(harness.bus.types()).toEqual([]);
  });

  it('does nothing for a tenant without a subscription', async () => {
    const harness = new SubscriptionsHarness();

    await harness.standing().settle(TENANT);
    await harness.standing().markPastDue(TENANT);

    expect(harness.subscriptions.current()).toBeUndefined();
    expect(harness.bus.types()).toEqual([]);
  });
});
