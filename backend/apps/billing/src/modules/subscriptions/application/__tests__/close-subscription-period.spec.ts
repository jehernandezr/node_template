import { SubscriptionStatus } from '@contracts/billing';
import { CatalogPlans } from '../../../../__tests__/utils/catalog-plans.js';
import { SubscriptionsHarness } from '../../../../__tests__/utils/subscriptions-harness.js';

const TENANT = SubscriptionsHarness.TENANT;

describe('CloseSubscriptionPeriod', () => {
  it('moves an active subscription to its next period and returns what the invoice of the closed one charges', async () => {
    const harness = new SubscriptionsHarness();
    await harness.seedActive(CatalogPlans.BASIC);

    const closed = await harness.closing().execute(TENANT, '2026-12-01');

    expect(closed).toMatchObject({
      start: '2026-11-01',
      end: '2026-11-30',
      prorationMinor: 0,
    });
    expect(closed?.plan.id).toBe(CatalogPlans.BASIC.id);
    expect(harness.subscriptions.current()?.snapshot().period).toMatchObject({
      start: '2026-12-01',
    });
  });

  it('closes a period once: the same day again finds nothing due, so it is never invoiced twice', async () => {
    const harness = new SubscriptionsHarness();
    await harness.seedActive();
    await harness.closing().execute(TENANT, '2026-12-01');

    await expect(
      harness.closing().execute(TENANT, '2026-12-01'),
    ).resolves.toBeUndefined();
  });

  it('leaves a period that has not ended yet untouched', async () => {
    const harness = new SubscriptionsHarness();
    await harness.seedActive();

    await expect(
      harness.closing().execute(TENANT, '2026-11-30'),
    ).resolves.toBeUndefined();
    expect(harness.subscriptions.current()?.snapshot().period).toMatchObject({
      start: '2026-11-01',
    });
  });

  it('activates an ending trial without anything to invoice', async () => {
    const harness = new SubscriptionsHarness();
    await harness.open().execute(TENANT);

    const closed = await harness.closing().execute(TENANT, '2026-11-16');

    expect(closed).toBeUndefined();
    expect(harness.subscriptions.current()?.snapshot().status).toBe(
      SubscriptionStatus.Active,
    );
  });

  it('does not close the period of a suspended subscription', async () => {
    const harness = new SubscriptionsHarness();
    await harness.seedActive();
    const suspended = harness.subscriptions.current();
    suspended?.markPastDue(harness.clock.now());
    suspended?.suspendIfOverdue(new Date('2026-12-31T00:00:00.000Z'), 7);
    if (suspended !== undefined) {
      await harness.subscriptions.update(suspended);
    }
    expect(harness.subscriptions.current()?.snapshot().status).toBe(
      SubscriptionStatus.Suspended,
    );

    await expect(
      harness.closing().execute(TENANT, '2026-12-01'),
    ).resolves.toBeUndefined();
  });

  it('finds nothing to close for a tenant without a subscription', async () => {
    const harness = new SubscriptionsHarness();

    await expect(
      harness.closing().execute(TENANT, '2026-12-01'),
    ).resolves.toBeUndefined();
  });
});
