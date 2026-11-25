import type { UsageMetric } from '@contracts/billing';
import type { QuotaCheck } from './quota-check.js';
import { QuotaExceededError } from './quota-exceeded.error.js';

/** Queries the quotas of a tenant's current plan. */
export abstract class QuotaChecker {
  /** Whether the tenant can consume `requested` (1 by default) more of the metric. */
  abstract check(
    tenantId: string,
    metric: UsageMetric,
    requested?: number,
  ): Promise<QuotaCheck>;

  /** @throws QuotaExceededError `BILLING.QUOTA.EXCEEDED` if the request does not fit in the quota. */
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
