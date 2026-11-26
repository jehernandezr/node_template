import type { Subscription } from './subscription.js';

/** The subscription of the tenant of the open `ShardScope`. There is at most one per tenant. */
export abstract class SubscriptionRepository {
  /**
   * Reads the subscription of the tenant in scope.
   * @returns The subscription, or `undefined` when there is none.
   */
  abstract find(): Promise<Subscription | undefined>;
  /**
   * Takes the row with `FOR UPDATE` until the end of the open transaction: serializes the tenant's charge changes,
   * so two concurrent payments do not each decide while the other's invoice is still unpaid.
   */
  abstract lock(): Promise<void>;
  /**
   * Stores a new subscription.
   * @param subscription Subscription to store.
   */
  abstract insert(subscription: Subscription): Promise<void>;
  /**
   * Saves the changes of the subscription.
   * @param subscription Subscription read earlier and changed.
   * @throws OptimisticLockError if another write changed it since it was read.
   */
  abstract update(subscription: Subscription): Promise<void>;
  /**
   * Deletes the subscription of the tenant in scope.
   * Returns `false` if there was no subscription.
   * @returns Whether there was one.
   */
  abstract remove(): Promise<boolean>;
}
