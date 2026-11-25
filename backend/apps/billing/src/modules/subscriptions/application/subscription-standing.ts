import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@contracts/billing';
import { AppConfig } from '@platform/config';
import { Clock, TransactionManager } from '@platform/kernel';
import type { BillingConfig } from '../../../config/billing.config.js';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { PlansFacade } from '../../plans/index.js';
import { BillingPeriod } from '../domain/billing-period.js';
import { SubscriptionRepository } from '../domain/subscription.repository.js';
import type { Subscription } from '../domain/subscription.js';
import { SubscriptionEvents } from './subscription-events.js';

/** Ciclo de morosidad: un cobro fallido, la suspensión al terminar la gracia y la reactivación por un pago. */
@Injectable()
export class SubscriptionStanding {
  private readonly graceDays: number;

  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly plans: PlansFacade,
    private readonly events: SubscriptionEvents,
    private readonly shard: TenantShard,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
    config: AppConfig,
  ) {
    this.graceDays = config.root<BillingConfig>().BILLING_GRACE_DAYS;
  }

  markPastDue(tenantId: string): Promise<void> {
    return this.change(tenantId, async (subscription) => {
      if (subscription.markPastDue(this.clock.now())) {
        await this.subscriptions.update(subscription);
      }
    });
  }

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

  /** El periodo de gracia de una morosa: antes de este instante, ya se suspende. */
  overdueCutoff(): Date {
    return new Date(this.clock.now().getTime() - this.graceDays * 86_400_000);
  }

  private change(
    tenantId: string,
    apply: (subscription: Subscription) => Promise<void>,
  ): Promise<void> {
    return this.shard.run(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const subscription = await this.subscriptions.find();
        if (subscription !== undefined) {
          await apply(subscription);
        }
      }),
    );
  }
}
