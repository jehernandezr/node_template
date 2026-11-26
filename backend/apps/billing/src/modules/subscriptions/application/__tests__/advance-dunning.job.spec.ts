import {
  SubscriptionStatus,
  SubscriptionSuspendedEvent,
} from '@contracts/billing';
import { SilentLogger } from '@platform/messaging/test-utils';
import { SubscriptionMaintenance } from '../../domain/subscription-maintenance.js';
import { SubscriptionsHarness } from '../../__tests__/utils/index.js';
import { AdvanceDunningJob } from '../advance-dunning.job.js';

const DAY_MS = 86_400_000;
const TENANT = SubscriptionsHarness.TENANT;

/** Maintenance that lists the tenant of the harness as past due before any cutoff it is asked about. */
class PastDueTenants extends SubscriptionMaintenance {
  readonly cutoffs: Date[] = [];

  constructor(private readonly tenants: readonly string[]) {
    super();
  }

  override async dueForClosing(): Promise<readonly string[]> {
    return [];
  }

  override async pastDueBefore(cutoff: Date): Promise<readonly string[]> {
    this.cutoffs.push(cutoff);
    return this.tenants;
  }
}

describe('AdvanceDunningJob', () => {
  it('asks for the tenants past due since before the grace days and suspends them', async () => {
    const harness = new SubscriptionsHarness();
    await harness.seedActive();
    await harness.standing().markPastDue(TENANT);
    harness.clock.advance((SubscriptionsHarness.GRACE_DAYS + 1) * DAY_MS);
    const maintenance = new PastDueTenants([TENANT]);

    await new AdvanceDunningJob(
      maintenance,
      harness.standing(),
      new SilentLogger(),
    ).run();

    expect(maintenance.cutoffs).toEqual([
      new Date(
        harness.clock.now().getTime() -
          SubscriptionsHarness.GRACE_DAYS * DAY_MS,
      ),
    ]);
    expect(harness.subscriptions.current()?.snapshot().status).toBe(
      SubscriptionStatus.Suspended,
    );
    expect(harness.bus.types()).toContain(SubscriptionSuspendedEvent.type);
  });

  it('runs again without suspending twice', async () => {
    const harness = new SubscriptionsHarness();
    await harness.seedActive();
    await harness.standing().markPastDue(TENANT);
    harness.clock.advance((SubscriptionsHarness.GRACE_DAYS + 1) * DAY_MS);
    const job = new AdvanceDunningJob(
      new PastDueTenants([TENANT]),
      harness.standing(),
      new SilentLogger(),
    );

    await job.run();
    await job.run();

    expect(
      harness.bus
        .types()
        .filter((type) => type === SubscriptionSuspendedEvent.type),
    ).toHaveLength(1);
  });
});
