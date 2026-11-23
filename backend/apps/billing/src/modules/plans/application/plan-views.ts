import type { Plan as PlanView } from '@contracts/billing';
import type { Plan } from '../domain/plan.js';

/** El plan como lo publica el contrato. Utilidad pura. */
export class PlanViews {
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
