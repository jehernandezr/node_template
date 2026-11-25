import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { AppConfig } from '@platform/config';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import type { BillingConfig } from '../../../config/billing.config.js';
import { PlansFacade } from '../../plans/index.js';
import { BillingPeriod } from '../domain/billing-period.js';
import { SubscriptionRepository } from '../domain/subscription.repository.js';
import { Subscription } from '../domain/subscription.js';
import type { CurrentSubscription } from './current-subscription.js';
import { SubscriptionEvents } from './subscription-events.js';

/**
 * Opens the subscription of a new tenant with the `BILLING_TRIAL_PLAN` plan, on trial for
 * `BILLING_TRIAL_DAYS`. It is idempotent: the signup saga can repeat it.
 */
@Injectable()
export class OpenSubscription {
  private readonly settings: BillingConfig;

  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly plans: PlansFacade,
    private readonly events: SubscriptionEvents,
    private readonly shard: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    config: AppConfig,
  ) {
    this.settings = config.root<BillingConfig>();
  }

  /** @throws BillingError `BILLING.PLAN.NOT_AVAILABLE` if the trial plan is not in the catalog. */
  execute(tenantId: string): Promise<CurrentSubscription> {
    return this.shard.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const existing = await this.subscriptions.find();
        if (existing !== undefined) {
          return {
            subscription: existing.snapshot(),
            plan: await this.plans.require(existing.snapshot().planId),
          };
        }
        const plan = await this.plans.requireCode(
          this.settings.BILLING_TRIAL_PLAN,
        );
        const subscription = Subscription.open({
          id: this.ids.next().toString(),
          plan: plan.snapshot(),
          today: BillingPeriod.dateOf(this.clock.now()),
          trialDays: this.settings.BILLING_TRIAL_DAYS,
        });
        await this.subscriptions.insert(subscription);
        await this.events.planChanged(tenantId, subscription, null, plan);
        return { subscription: subscription.snapshot(), plan };
      }),
    );
  }
}
