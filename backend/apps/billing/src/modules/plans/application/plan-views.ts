import type { Plan as PlanView } from '@contracts/billing';
import type { Plan } from '../domain/plan.js';

/** The plan as the contract publishes it. Pure utility. */
export class PlanViews {
  /**
   * Builds the API view of a plan.
   * @param plan Plan from the catalog.
   * @returns The plan with its price and quotas.
   */
  static of(plan: Plan): PlanView {
    const state = plan.snapshot();
    return {
      id: state.id,
      name: state.name,
      price: { amountMinor: state.priceMinor, currency: state.currency },
      periodicity: state.periodicity,
      quotas: state.quotas.map((quota) => ({
        metric: quota.metric,
        limit: quota.limit,
      })),
      features: [...state.features],
    };
  }
}
