import type { PlanFeature } from '@contracts/identity';
import type {
  Currency,
  PlanPeriodicity,
  UsageMetric,
} from '@contracts/billing';

/** Límite de una métrica en un plan y, si se factura por unidad, su precio en unidades menores. */
export interface PlanQuota {
  readonly metric: UsageMetric;
  readonly limit: number;
  readonly unitPriceMinor?: number;
}

/** Estado de un plan del catálogo. `code` es estable entre ambientes; `id` lo genera cada catálogo. */
export interface PlanState {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly priceMinor: number;
  readonly currency: Currency;
  readonly periodicity: PlanPeriodicity;
  readonly quotas: readonly PlanQuota[];
  readonly features: readonly PlanFeature[];
}

/** Un plan del catálogo: precio fijo por periodo, cuotas por métrica y funcionalidades. */
export class Plan {
  private constructor(private readonly state: PlanState) {}

  static of(state: PlanState): Plan {
    return new Plan(state);
  }

  get id(): string {
    return this.state.id;
  }

  snapshot(): PlanState {
    return this.state;
  }

  /** El límite de la métrica, o `undefined` si el plan no la limita. */
  limitOf(metric: UsageMetric): number | undefined {
    return this.state.quotas.find((quota) => quota.metric === metric)?.limit;
  }
}
