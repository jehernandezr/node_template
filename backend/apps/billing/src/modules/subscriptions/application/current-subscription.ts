import type { Plan } from '../../plans/index.js';
import type { SubscriptionState } from '../domain/subscription.js';

/** La suscripción de un tenant con su plan vigente. */
export interface CurrentSubscription {
  readonly subscription: SubscriptionState;
  readonly plan: Plan;
}

/** El periodo cerrado con el plan con que se cobra. */
export interface ClosedSubscriptionPeriod {
  readonly start: string;
  readonly end: string;
  readonly plan: Plan;
  readonly prorationMinor: number;
}
