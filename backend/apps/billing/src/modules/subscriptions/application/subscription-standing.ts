import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@contracts/billing';
import { Clock, TransactionManager } from '@platform/kernel';
import { BillingSettings } from '../../../config/billing-settings.js';
import { PlansFacade } from '../../plans/index.js';
import { BillingPeriod } from '../domain/billing-period.js';
import { SubscriptionRepository } from '../domain/subscription.repository.js';
import type { Subscription } from '../domain/subscription.js';
import { SubscriptionEvents } from './subscription-events.js';

/** Delinquency cycle: a failed charge, suspension when the grace period ends, and reactivation by a payment. */
@Injectable()
export class SubscriptionStanding {
  private readonly graceDays: number;

  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly plans: PlansFacade,
    private readonly events: SubscriptionEvents,
    private readonly shard: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
    settings: BillingSettings,
  ) {
    this.graceDays = settings.values.BILLING_GRACE_DAYS;
  }

  /**
   * Marks the active subscription past due after a failed charge.
   * @param tenantId Tenant whose charge failed.
   */
  markPastDue(tenantId: string): Promise<void> {
    return this.change(tenantId, async (subscription) => {
      if (subscription.markPastDue(this.clock.now())) {
        await this.subscriptions.update(subscription);
      }
    });
  }

  /**
   * Suspends the subscription when its grace period as past due ended.
   * @param tenantId Tenant to check.
   */
  suspendIfOverdue(tenantId: string): Promise<void> {
    return this.change(tenantId, async (subscription) => {
      if (subscription.suspendIfOverdue(this.clock.now(), this.graceDays)) {
        await this.subscriptions.update(subscription);
        await this.events.suspended(
          tenantId,
          subscription,
          await this.plans.require(subscription.snapshot().planId),
        );
      }
    });
  }

  /**
   * Reactivates a past-due or suspended subscription after a payment, locking it against a concurrent settle.
   * @param tenantId Tenant that paid.
   */
  settle(tenantId: string): Promise<void> {
    return this.change(tenantId, async (subscription) => {
      const plan = await this.plans.require(subscription.snapshot().planId);
      const previous = subscription.settle(
        plan.snapshot(),
        BillingPeriod.dateOf(this.clock.now()),
      );
      if (previous === undefined) {
        return;
      }
      await this.subscriptions.update(subscription);
      if (previous === SubscriptionStatus.Suspended) {
        await this.events.reactivated(tenantId, subscription, plan);
      }
    });
  }

  /**
   * The grace period of a past-due subscription: past due before this instant means it is suspended.
   * @returns The instant before which a past-due subscription is suspended.
   */
  overdueCutoff(): Date {
    return new Date(this.clock.now().getTime() - this.graceDays * 86_400_000);
  }

  private change(
    tenantId: string,
    apply: (subscription: Subscription) => Promise<void>,
  ): Promise<void> {
    return this.shard.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const subscription = await this.subscriptions.find();
        if (subscription !== undefined) {
          await apply(subscription);
        }
      }),
    );
  }
}
