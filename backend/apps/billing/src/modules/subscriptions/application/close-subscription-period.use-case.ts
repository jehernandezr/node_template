import { Injectable } from '@nestjs/common';
import { TransactionManager } from '@platform/kernel';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { PlansFacade } from '../../plans/index.js';
import { SubscriptionRepository } from '../domain/subscription.repository.js';
import type { ClosedSubscriptionPeriod } from './current-subscription.js';

/** Moves the subscription to the next period and returns what its invoice must charge. */
@Injectable()
export class CloseSubscriptionPeriod {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly plans: PlansFacade,
    private readonly shard: TenantShard,
    private readonly transactions: TransactionManager,
  ) {}

  /** Runs inside the invoicing caller's transaction, so that the invoice and the new period go together. */
  execute(
    tenantId: string,
    today: string,
  ): Promise<ClosedSubscriptionPeriod | undefined> {
    return this.shard.run(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const subscription = await this.subscriptions.find();
        if (
          subscription === undefined ||
          !subscription.isDueForClosing(today)
        ) {
          return undefined;
        }
        const plan = await this.plans.require(subscription.snapshot().planId);
        const closed = subscription.closePeriod(plan.snapshot());
        await this.subscriptions.update(subscription);
        if (closed === undefined) {
          return undefined;
        }
        return {
          start: closed.period.start,
          end: closed.period.end,
          plan: await this.plans.require(closed.planId),
          prorationMinor: closed.prorationMinor,
        };
      }),
    );
  }
}
