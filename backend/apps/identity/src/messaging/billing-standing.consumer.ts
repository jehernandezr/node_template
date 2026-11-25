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
import { ApplyBillingStanding } from '../modules/tenants/index.js';

/**
 * Queue `identity-billing`: delinquency suspends the tenant, a payment reactivates it and a plan change
 * refreshes the features that travel in its members' access.
 */
@Injectable()
export class BillingStandingConsumer {
  constructor(private readonly standing: ApplyBillingStanding) {}

  @Subscribe(SubscriptionSuspendedEvent)
  onSuspended(data: SubscriptionSuspendedPayload): Promise<void> {
    return this.standing.suspended(data.tenantId);
  }

  @Subscribe(SubscriptionReactivatedEvent)
  onReactivated(data: SubscriptionReactivatedPayload): Promise<void> {
    return this.standing.reactivated(data.tenantId);
  }

  @Subscribe(EntitlementsChangedEvent)
  onEntitlementsChanged(data: EntitlementsChangedPayload): Promise<void> {
    return this.standing.planChanged(
      data.tenantId,
      data.features,
      new Date(data.changedAt),
    );
  }
}
