import { SubscriptionRepository } from '../../modules/subscriptions/domain/subscription.repository.js';
import { Subscription } from '../../modules/subscriptions/domain/subscription.js';

/** The subscription of one tenant kept in memory, stored as snapshots so a write is only seen once saved. */
export class InMemorySubscriptions extends SubscriptionRepository {
  private stored: Subscription | undefined;
  locks = 0;

  override async find(): Promise<Subscription | undefined> {
    return this.stored === undefined
      ? undefined
      : Subscription.rehydrate(this.stored.snapshot());
  }

  override async lock(): Promise<void> {
    this.locks += 1;
  }

  override async insert(subscription: Subscription): Promise<void> {
    this.stored = Subscription.rehydrate(subscription.snapshot());
  }

  override async update(subscription: Subscription): Promise<void> {
    this.stored = Subscription.rehydrate(subscription.snapshot());
  }

  override async remove(): Promise<boolean> {
    const existed = this.stored !== undefined;
    this.stored = undefined;
    return existed;
  }

  /** The stored subscription, as a later read would see it. */
  current(): Subscription | undefined {
    return this.stored;
  }
}
