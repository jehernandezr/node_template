import type { Plan } from '../../plans/index.js';
import type { Entitlements } from '../domain/entitlements.js';
import type { Subscription } from '../domain/subscription.js';

/** Las funcionalidades y cuotas que da una suscripción con su plan. Utilidad pura. */
export class EntitlementsOf {
  static subscription(subscription: Subscription, plan: Plan): Entitlements {
    const state = plan.snapshot();
    return {
      status: subscription.snapshot().status,
      features: subscription.isBlocked() ? [] : state.features,
      quotas: state.quotas.map((quota) => ({
        metric: quota.metric,
        limit: quota.limit,
      })),
    };
  }
}
