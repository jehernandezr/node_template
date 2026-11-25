import type { Subscription } from './subscription.js';

/** The subscription of the tenant of the open `ShardScope`. There is at most one per tenant. */
export abstract class SubscriptionRepository {
  abstract find(): Promise<Subscription | undefined>;
  /**
   * Takes the row with `FOR UPDATE` until the end of the open transaction: serializes the tenant's charge changes,
   * so two concurrent payments do not each decide while the other's invoice is still unpaid.
   */
  abstract lock(): Promise<void>;
  abstract insert(subscription: Subscription): Promise<void>;
  /** @throws OptimisticLockError if another write changed it since it was read. */
  abstract update(subscription: Subscription): Promise<void>;
  /** Returns `false` if there was no subscription. */
  abstract remove(): Promise<boolean>;
}
