import type { UsageMetric } from '@contracts/billing';

/** Whether a tenant can consume the requested amount of a metric, with its limit and what was already used in the period. */
export interface QuotaCheck {
  readonly metric: UsageMetric;
  readonly limit: number;
  readonly used: number;
  readonly allowed: boolean;
}
