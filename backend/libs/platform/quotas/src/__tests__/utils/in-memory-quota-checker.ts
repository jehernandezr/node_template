import type { UsageMetric } from '@contracts/billing';
import type { QuotaCheck } from '../../quota-check.js';
import { QuotaChecker } from '../../quota-checker.js';

/** Quotas set by the test, per tenant and metric; with no limit set, everything fits. */
export class InMemoryQuotaChecker extends QuotaChecker {
  private readonly usage = new Map<string, { limit: number; used: number }>();

  set(tenantId: string, metric: UsageMetric, limit: number, used: number) {
    this.usage.set(`${tenantId}:${metric}`, { limit, used });
  }

  override async check(
    tenantId: string,
    metric: UsageMetric,
    requested = 1,
  ): Promise<QuotaCheck> {
    const usage = this.usage.get(`${tenantId}:${metric}`);
    if (usage === undefined) {
      return { metric, limit: 0, used: 0, allowed: true };
    }
    return { metric, ...usage, allowed: usage.used + requested <= usage.limit };
  }
}
