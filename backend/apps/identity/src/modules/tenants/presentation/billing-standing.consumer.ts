import { Injectable } from '@nestjs/common';
import {
  EntitlementsChangedEvent,
  SubscriptionReactivatedEvent,
  SubscriptionSuspendedEvent,
  type EntitlementsChangedPayload,
  type SubscriptionReactivatedPayload,
  type SubscriptionSuspendedPayload,
} from '@contracts/billing';
import { Subscribe } from '@platform/messaging/nest';
import { ApplyBillingStanding } from '../application/apply-billing-standing.use-case.js';

/**
 * Queue `identity-billing`: delinquency suspends the tenant, a payment reactivates it and a plan change
 * refreshes the features that travel in its members' access.
 */
@Injectable()
export class BillingStandingConsumer {
  constructor(private readonly standing: ApplyBillingStanding) {}

  /**
   * Suspends the tenant of a suspended subscription.
   * @param data Event payload.
   */
  @Subscribe(SubscriptionSuspendedEvent)
  onSuspended(data: SubscriptionSuspendedPayload): Promise<void> {
    return this.standing.suspended(data.tenantId);
  }

  /**
   * Reactivates the tenant of a reactivated subscription.
   * @param data Event payload.
   */
  @Subscribe(SubscriptionReactivatedEvent)
  onReactivated(data: SubscriptionReactivatedPayload): Promise<void> {
    return this.standing.reactivated(data.tenantId);
  }

  /**
   * Applies the features of a plan change to the tenant.
   * @param data Event payload.
   */
  @Subscribe(EntitlementsChangedEvent)
  onEntitlementsChanged(data: EntitlementsChangedPayload): Promise<void> {
    return this.standing.planChanged(
      data.tenantId,
      data.features,
      new Date(data.changedAt),
    );
  }
}
