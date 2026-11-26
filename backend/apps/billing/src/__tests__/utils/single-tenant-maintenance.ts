import { SubscriptionMaintenance } from '../../modules/subscriptions/domain/subscription-maintenance.js';
import type { InMemorySubscriptions } from './in-memory-subscriptions.js';

/** `SubscriptionMaintenance` over the one tenant whose subscription the in-memory repository keeps. */
export class SingleTenantMaintenance extends SubscriptionMaintenance {
  constructor(
    private readonly tenantId: string,
    private readonly subscriptions: InMemorySubscriptions,
  ) {
    super();
  }

  override async dueForClosing(today: string): Promise<readonly string[]> {
    const subscription = this.subscriptions.current();
    return subscription?.isDueForClosing(today) === true ? [this.tenantId] : [];
  }

  override async pastDueBefore(cutoff: Date): Promise<readonly string[]> {
    const since = this.subscriptions.current()?.snapshot().pastDueSince;
    return since !== undefined && since < cutoff ? [this.tenantId] : [];
  }
}
