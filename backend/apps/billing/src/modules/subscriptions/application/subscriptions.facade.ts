import type { Entitlements } from '../domain/entitlements.js';
import type {
  ClosedSubscriptionPeriod,
  CurrentSubscription,
} from './current-subscription.js';

/** Opens, reads, closes and settles tenant subscriptions for invoices, payments and usage. */
export abstract class SubscriptionsFacade {
  /**
   * Opens the subscription on trial; if it already exists, returns it unchanged.
   * @param tenantId Tenant whose subscription opens.
   * @returns The current subscription.
   */
  abstract open(tenantId: string): Promise<CurrentSubscription>;
  /**
   * Deletes the subscription. Returns `false` if there was none.
   * @param tenantId Tenant whose subscription is deleted.
   * @returns Whether a subscription existed.
   */
  abstract remove(tenantId: string): Promise<boolean>;
  /**
   * Reads the subscription with its plan.
   * @param tenantId Tenant to read.
   * @returns The current subscription.
   * @throws BillingError `BILLING.SUBSCRIPTION.NOT_FOUND` if the tenant has no subscription.
   */
  abstract current(tenantId: string): Promise<CurrentSubscription>;
  /**
   * Reads what the tenant's plan entitles it to.
   * @param tenantId Tenant to read.
   * @returns The entitlements.
   * @throws BillingError `BILLING.SUBSCRIPTION.NOT_FOUND` if the tenant has no subscription.
   */
  abstract entitlements(tenantId: string): Promise<Entitlements>;
  /**
   * Closes the expired period. `undefined` if it was not due or if it was the trial, which is not invoiced.
   * @param tenantId Tenant whose period closes.
   * @param today Closing date, `YYYY-MM-DD` in UTC.
   * @returns What the invoice charges, or `undefined`.
   */
  abstract closePeriod(
    tenantId: string,
    today: string,
  ): Promise<ClosedSubscriptionPeriod | undefined>;
  /**
   * Lists the tenants whose period ended before `today`.
   * @param today Date, `YYYY-MM-DD` in UTC.
   * @returns Ids of the tenants due for closing.
   */
  abstract dueForClosing(today: string): Promise<readonly string[]>;
  /**
   * A charge failed: the active subscription becomes past due.
   * @param tenantId Tenant whose charge failed.
   */
  abstract markPastDue(tenantId: string): Promise<void>;
  /**
   * Takes the subscription with `FOR UPDATE` inside the caller's transaction, to serialize the tenant's
   * charges. It goes before reading its invoices.
   * @param tenantId Tenant of the subscription.
   */
  abstract lock(tenantId: string): Promise<void>;
  /**
   * A payment arrived: the past-due or suspended subscription becomes active again.
   * @param tenantId Tenant that paid.
   */
  abstract settle(tenantId: string): Promise<void>;
}
