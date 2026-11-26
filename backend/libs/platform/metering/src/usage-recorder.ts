import type { UsageMetric } from '@contracts/billing';

/** Counts a tenant's metered usage to send it to billing. */
export abstract class UsageRecorder {
  /**
   * Counts usage of a metric for a tenant; it reaches billing in the next flush.
   * @param tenantId Tenant that consumed.
   * @param metric Metric consumed.
   * @param quantity Units consumed; 1 by default.
   */
  abstract record(
    tenantId: string,
    metric: UsageMetric,
    quantity?: number,
  ): Promise<void>;
}
