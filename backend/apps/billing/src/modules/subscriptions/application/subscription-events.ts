import {
  EntitlementsChangedEvent,
  SubscriptionChangedEvent,
  SubscriptionReactivatedEvent,
  SubscriptionSuspendedEvent,
} from '@contracts/billing';
import { MessageBus } from '@platform/messaging';
import { Injectable } from '@nestjs/common';
import { Clock } from '@platform/kernel';
import type { Plan } from '../../plans/index.js';
import type { Subscription } from '../domain/subscription.js';
import { EntitlementsOf } from './entitlements-of.js';

/** The integration events of a subscription, published through the outbox of the open transaction. */
@Injectable()
export class SubscriptionEvents {
  constructor(
    private readonly bus: MessageBus,
    private readonly clock: Clock,
  ) {}

  /**
   * Publishes that the tenant changed plan.
   * @param tenantId Tenant that changed plan.
   * @param subscription Subscription after the change.
   * @param previousPlanId Plan it left, or `null` when it is new.
   * @param plan Plan it moved to.
   */
  async planChanged(
    tenantId: string,
    subscription: Subscription,
    previousPlanId: string | null,
    plan: Plan,
  ): Promise<void> {
    const state = subscription.snapshot();
    await this.bus.publish(
      SubscriptionChangedEvent,
      {
        tenantId,
        subscriptionId: state.id,
        previousPlanId,
        planId: state.planId,
        changedAt: this.now(),
      },
      { tenantId },
    );
    await this.entitlementsChanged(tenantId, subscription, plan);
  }

  /**
   * Publishes that the subscription was suspended for lack of payment.
   * @param tenantId Suspended tenant.
   * @param subscription Suspended subscription.
   * @param plan Its plan.
   */
  async suspended(
    tenantId: string,
    subscription: Subscription,
    plan: Plan,
  ): Promise<void> {
    await this.bus.publish(
      SubscriptionSuspendedEvent,
      {
        tenantId,
        subscriptionId: subscription.snapshot().id,
        suspendedAt: this.now(),
      },
      { tenantId },
    );
    await this.entitlementsChanged(tenantId, subscription, plan);
  }

  /**
   * Publishes that a suspended or past-due subscription is active again.
   * @param tenantId Reactivated tenant.
   * @param subscription Active subscription.
   * @param plan Its plan.
   */
  async reactivated(
    tenantId: string,
    subscription: Subscription,
    plan: Plan,
  ): Promise<void> {
    await this.bus.publish(
      SubscriptionReactivatedEvent,
      {
        tenantId,
        subscriptionId: subscription.snapshot().id,
        reactivatedAt: this.now(),
      },
      { tenantId },
    );
    await this.entitlementsChanged(tenantId, subscription, plan);
  }

  private async entitlementsChanged(
    tenantId: string,
    subscription: Subscription,
    plan: Plan,
  ): Promise<void> {
    const entitlements = EntitlementsOf.subscription(subscription, plan);
    await this.bus.publish(
      EntitlementsChangedEvent,
      {
        tenantId,
        features: [...entitlements.features],
        quotas: [...entitlements.quotas],
        changedAt: this.now(),
      },
      { tenantId },
    );
  }

  private now(): string {
    return this.clock.now().toISOString();
  }
}
