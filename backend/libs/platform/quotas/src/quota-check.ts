import type { UsageMetric } from '@contracts/billing';

/** Si un tenant puede consumir lo pedido de una métrica, con su límite y lo ya usado en el periodo. */
export interface QuotaCheck {
  readonly metric: UsageMetric;
  readonly limit: number;
  readonly used: number;
  readonly allowed: boolean;
}
