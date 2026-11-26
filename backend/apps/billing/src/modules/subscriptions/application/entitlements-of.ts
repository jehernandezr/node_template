import type { Plan } from '../../plans/index.js';
import type { Entitlements } from '../domain/entitlements.js';
import type { Subscription } from '../domain/subscription.js';

/** The features and quotas a subscription grants with its plan. Pure utility. */
export class EntitlementsOf {
  /**
   * Computes what a subscription entitles its tenant to: nothing while blocked, the plan otherwise.
   * @param subscription Current subscription.
   * @param plan Its plan.
   * @returns The entitlements.
   */
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
