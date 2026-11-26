import type { Entitlements } from '@contracts/billing';
import type {
  ClosedSubscriptionPeriod,
  CurrentSubscription,
} from '../../../subscriptions/index.js';
import { SubscriptionsFacade } from '../../../subscriptions/index.js';

/** `SubscriptionsFacade` that records the standing changes the invoices ask for, in a shared journal. */
export class RecordingSubscriptions extends SubscriptionsFacade {
  constructor(private readonly journal: string[] = []) {
    super();
  }

  override async lock(tenantId: string): Promise<void> {
    this.journal.push(`lock:${tenantId}`);
  }

  override async settle(tenantId: string): Promise<void> {
    this.journal.push(`settle:${tenantId}`);
  }

  override async markPastDue(tenantId: string): Promise<void> {
    this.journal.push(`past-due:${tenantId}`);
  }

  override open(): Promise<CurrentSubscription> {
    return Promise.reject(new Error('not used by the invoices'));
  }

  override remove(): Promise<boolean> {
    return Promise.reject(new Error('not used by the invoices'));
  }

  override current(): Promise<CurrentSubscription> {
    return Promise.reject(new Error('not used by the invoices'));
  }

  override entitlements(): Promise<Entitlements> {
    return Promise.reject(new Error('not used by the invoices'));
  }

  override closePeriod(): Promise<ClosedSubscriptionPeriod | undefined> {
    return Promise.reject(new Error('not used by the invoices'));
  }

  override dueForClosing(): Promise<readonly string[]> {
    return Promise.reject(new Error('not used by the invoices'));
  }
}
