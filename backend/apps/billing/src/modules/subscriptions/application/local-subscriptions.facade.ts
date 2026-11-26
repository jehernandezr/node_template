import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { BillingErrorCode } from '@contracts/billing';
import { BillingError } from '../../../shared/errors/billing.error.js';
import { PlansFacade } from '../../plans/index.js';
import type { Entitlements } from '../domain/entitlements.js';
import { SubscriptionMaintenance } from '../domain/subscription-maintenance.js';
import { SubscriptionRepository } from '../domain/subscription.repository.js';
import { CloseSubscriptionPeriod } from './close-subscription-period.use-case.js';
import type {
  ClosedSubscriptionPeriod,
  CurrentSubscription,
} from './current-subscription.js';
import { EntitlementsOf } from './entitlements-of.js';
import { OpenSubscription } from './open-subscription.use-case.js';
import { SubscriptionStanding } from './subscription-standing.js';
import { SubscriptionsFacade } from './subscriptions.facade.js';

/** In-process `SubscriptionsFacade`. */
@Injectable()
export class LocalSubscriptionsFacade extends SubscriptionsFacade {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly maintenance: SubscriptionMaintenance,
    private readonly plans: PlansFacade,
    private readonly openSubscription: OpenSubscription,
    private readonly closing: CloseSubscriptionPeriod,
    private readonly standing: SubscriptionStanding,
    private readonly shard: ShardScopes,
  ) {
    super();
  }

  open(tenantId: string): Promise<CurrentSubscription> {
    return this.openSubscription.execute(tenantId);
  }

  remove(tenantId: string): Promise<boolean> {
    return this.shard.inTenantShard(tenantId, () =>
      this.subscriptions.remove(),
    );
  }

  current(tenantId: string): Promise<CurrentSubscription> {
    return this.shard.inTenantShard(tenantId, async () => {
      const subscription = await this.subscriptions.find();
      if (subscription === undefined) {
        throw new BillingError(BillingErrorCode.SubscriptionNotFound);
      }
      return {
        subscription: subscription.snapshot(),
        plan: await this.plans.require(subscription.snapshot().planId),
      };
    });
  }

  entitlements(tenantId: string): Promise<Entitlements> {
    return this.shard.inTenantShard(tenantId, async () => {
      const subscription = await this.subscriptions.find();
      if (subscription === undefined) {
        throw new BillingError(BillingErrorCode.SubscriptionNotFound);
      }
      return EntitlementsOf.subscription(
        subscription,
        await this.plans.require(subscription.snapshot().planId),
      );
    });
  }

  closePeriod(
    tenantId: string,
    today: string,
  ): Promise<ClosedSubscriptionPeriod | undefined> {
    return this.closing.execute(tenantId, today);
  }

  dueForClosing(today: string): Promise<readonly string[]> {
    return this.maintenance.dueForClosing(today);
  }

  markPastDue(tenantId: string): Promise<void> {
    return this.standing.markPastDue(tenantId);
  }

  /**
   * Takes the tenant's subscription with `FOR UPDATE` in the open transaction, on its shard.
   * @param tenantId Tenant of the subscription.
   */
  lock(tenantId: string): Promise<void> {
    return this.shard.inTenantShard(tenantId, () => this.subscriptions.lock());
  }

  settle(tenantId: string): Promise<void> {
    return this.standing.settle(tenantId);
  }
}
