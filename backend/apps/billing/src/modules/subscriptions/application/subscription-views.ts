import type { Subscription as SubscriptionView } from '@contracts/billing';
import { PlanViews } from '../../plans/index.js';
import type { CurrentSubscription } from './current-subscription.js';

/** The subscription as the contract publishes it. Pure utility. */
export class SubscriptionViews {
  /**
   * Builds the API view of the current subscription.
   * @param current Subscription with its plan.
   * @returns The subscription as the API returns it.
   */
  static of(current: CurrentSubscription): SubscriptionView {
    const state = current.subscription;
    return {
      id: state.id,
      plan: PlanViews.of(current.plan),
      status: state.status,
      period: { start: state.period.start, end: state.period.end },
    };
  }
}
