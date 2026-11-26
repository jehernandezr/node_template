import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { BillingErrorCode } from '@contracts/billing';
import { Clock, TransactionManager } from '@platform/kernel';
import { BillingError } from '../../../shared/errors/billing.error.js';
import { PlansFacade, type Plan } from '../../plans/index.js';
import { UsageFacade } from '../../usage/index.js';
import { BillingPeriod } from '../domain/billing-period.js';
import { SubscriptionRepository } from '../domain/subscription.repository.js';
import type { SubscriptionState } from '../domain/subscription.js';
import type { CurrentSubscription } from './current-subscription.js';
import { SubscriptionEvents } from './subscription-events.js';

/** Changes the plan of the tenant's subscription, with proration, and publishes the change and the new entitlements. */
@Injectable()
export class ChangePlan {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly plans: PlansFacade,
    private readonly usage: UsageFacade,
    private readonly events: SubscriptionEvents,
    private readonly shard: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
  ) {}

  /**
   * Moves the tenant to another plan, prorating the rest of the period.
   * @param tenantId Tenant that changes plan.
   * @param planId Plan to move to.
   * @returns The subscription after the change.
   * @throws BillingError `BILLING.SUBSCRIPTION.NOT_FOUND`, `BILLING.PLAN.NOT_AVAILABLE`,
   *   `BILLING.SUBSCRIPTION.NOT_CHANGEABLE` or `BILLING.PLAN.USAGE_EXCEEDS_LIMIT`.
   */
  execute(tenantId: string, planId: string): Promise<CurrentSubscription> {
    return this.shard.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const subscription = await this.subscriptions.find();
        if (subscription === undefined) {
          throw new BillingError(BillingErrorCode.SubscriptionNotFound);
        }
        const current = subscription.snapshot();
        const from = await this.plans.require(current.planId);
        const to = await this.plans.require(planId);
        await this.assertFits(tenantId, current, to);
        const changed = subscription.changePlan(
          from.snapshot(),
          to.snapshot(),
          BillingPeriod.dateOf(this.clock.now()),
        );
        if (changed) {
          await this.subscriptions.update(subscription);
          await this.events.planChanged(
            tenantId,
            subscription,
            current.planId,
            to,
          );
        }
        return { subscription: subscription.snapshot(), plan: to };
      }),
    );
  }

  private async assertFits(
    tenantId: string,
    current: SubscriptionState,
    to: Plan,
  ): Promise<void> {
    const levels = await this.usage.levels(
      tenantId,
      current.period.start,
      current.period.end,
    );
    const over = levels.find((level) => {
      const limit = to.limitOf(level.metric);
      return limit !== undefined && level.used > limit;
    });
    if (over !== undefined) {
      throw new BillingError(BillingErrorCode.PlanUsageExceedsLimit, {
        metric: over.metric,
        limit: to.limitOf(over.metric),
        used: over.used,
      });
    }
  }
}
