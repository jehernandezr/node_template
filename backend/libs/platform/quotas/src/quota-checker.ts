import type { UsageMetric } from '@contracts/billing';
import type { QuotaCheck } from './quota-check.js';
import { QuotaExceededError } from './quota-exceeded.error.js';

/** Queries the quotas of a tenant's current plan. */
export abstract class QuotaChecker {
  /**
   * Whether the tenant can consume `requested` (1 by default) more of the metric.
   * @param tenantId Tenant that consumes.
   * @param metric Metric being consumed.
   * @param requested Units about to be consumed.
   * @returns Whether it fits, with the limit and the usage.
   */
  abstract check(
    tenantId: string,
    metric: UsageMetric,
    requested?: number,
  ): Promise<QuotaCheck>;

  /**
   * Rejects a request that does not fit in the tenant's quota.
   * @param tenantId Tenant that consumes.
   * @param metric Metric being consumed.
   * @param requested Units about to be consumed.
   * @throws QuotaExceededError `BILLING.QUOTA.EXCEEDED` if the request does not fit in the quota.
   */
  async enforce(
    tenantId: string,
    metric: UsageMetric,
    requested?: number,
  ): Promise<void> {
    const quota = await this.check(tenantId, metric, requested);
    if (!quota.allowed) {
      throw new QuotaExceededError(metric, quota.limit, quota.used);
    }
  }
}
