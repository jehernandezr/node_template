import type { Plan } from '../../plans/index.js';
import type { SubscriptionState } from '../domain/subscription.js';

/** A tenant's subscription with its current plan. */
export interface CurrentSubscription {
  readonly subscription: SubscriptionState;
  readonly plan: Plan;
}

/** The closed period with the plan it is charged with. */
export interface ClosedSubscriptionPeriod {
  readonly start: string;
  readonly end: string;
  readonly plan: Plan;
  readonly prorationMinor: number;
}
