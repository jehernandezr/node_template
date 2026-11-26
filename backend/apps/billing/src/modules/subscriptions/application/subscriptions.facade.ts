import type { Entitlements } from '../domain/entitlements.js';
import type {
  ClosedSubscriptionPeriod,
  CurrentSubscription,
} from './current-subscription.js';

/** Opens, reads, closes and settles tenant subscriptions for invoices, payments and usage. */
export abstract class SubscriptionsFacade {
  /** Opens the subscription on trial; if it already exists, returns it unchanged. */
  abstract open(tenantId: string): Promise<CurrentSubscription>;
  /** Deletes the subscription. Returns `false` if there was none. */
  abstract remove(tenantId: string): Promise<boolean>;
  /** @throws BillingError `BILLING.SUBSCRIPTION.NOT_FOUND` if the tenant has no subscription. */
  abstract current(tenantId: string): Promise<CurrentSubscription>;
  /** @throws BillingError `BILLING.SUBSCRIPTION.NOT_FOUND` if the tenant has no subscription. */
  abstract entitlements(tenantId: string): Promise<Entitlements>;
  /** Closes the expired period. `undefined` if it was not due or if it was the trial, which is not invoiced. */
  abstract closePeriod(
    tenantId: string,
    today: string,
  ): Promise<ClosedSubscriptionPeriod | undefined>;
  abstract dueForClosing(today: string): Promise<readonly string[]>;
  /** A charge failed: the active subscription becomes past due. */
  abstract markPastDue(tenantId: string): Promise<void>;
  /**
   * Takes the subscription with `FOR UPDATE` inside the caller's transaction, to serialize the tenant's
   * charges. It goes before reading its invoices.
   * @param tenantId Tenant of the subscription.
   */
  abstract lock(tenantId: string): Promise<void>;
  /** A payment arrived: the past-due or suspended subscription becomes active again. */
  abstract settle(tenantId: string): Promise<void>;
}
