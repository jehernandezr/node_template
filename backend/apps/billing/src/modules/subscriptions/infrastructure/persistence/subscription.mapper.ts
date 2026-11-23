import type { SubscriptionStatus } from '@contracts/billing';
import { BillingPeriod } from '../../domain/billing-period.js';
import { Subscription } from '../../domain/subscription.js';
import { SubscriptionEntity } from './entities/subscription.entity.js';

/** Fila de `subscriptions` y agregado `Subscription`, en los dos sentidos. Utilidad pura. */
export class SubscriptionMapper {
  static toDomain(row: SubscriptionEntity): Subscription {
    return Subscription.rehydrate({
      id: row.id,
      planId: row.planId,
      periodPlanId: row.periodPlanId,
      status: row.status as SubscriptionStatus,
      period: BillingPeriod.of(row.periodStart, row.periodEnd),
      prorationMinor: Number(row.prorationMinor),
      ...(row.pastDueSince === null ? {} : { pastDueSince: row.pastDueSince }),
      ...(row.version === undefined ? {} : { version: row.version }),
    });
  }

  static toRow(subscription: Subscription): SubscriptionEntity {
    const state = subscription.snapshot();
    return Object.assign(new SubscriptionEntity(), {
      id: state.id,
      planId: state.planId,
      periodPlanId: state.periodPlanId,
      status: state.status,
      periodStart: state.period.start,
      periodEnd: state.period.end,
      prorationMinor: String(state.prorationMinor),
      pastDueSince: state.pastDueSince ?? null,
      ...(state.version === undefined ? {} : { version: state.version }),
    });
  }
}
