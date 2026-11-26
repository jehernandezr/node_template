import type { UsageMetric } from '@contracts/billing';
import { UsageAggregations } from '../../domain/usage-aggregations.js';
import {
  UsageLedger,
  type MeteredUsage,
  type UsageLevel,
} from '../../domain/usage-ledger.js';

/** In-memory `UsageLedger` with the same unique key per record as the table and the daily totals per metric. */
export class InMemoryUsageLedger extends UsageLedger {
  private readonly keys = new Set<string>();
  private readonly daily = new Map<string, number>();

  override async claim(usage: MeteredUsage): Promise<boolean> {
    await Promise.resolve();
    if (this.keys.has(usage.key)) {
      return false;
    }
    this.keys.add(usage.key);
    return true;
  }

  override async accumulate(
    day: string,
    metric: UsageMetric,
    quantity: number,
  ): Promise<void> {
    const key = `${day}|${metric}`;
    const current = this.daily.get(key) ?? 0;
    this.daily.set(
      key,
      UsageAggregations.isSum(metric)
        ? current + quantity
        : Math.max(current, quantity),
    );
  }

  override async levels(
    from: string,
    to: string,
  ): Promise<readonly UsageLevel[]> {
    const totals = new Map<UsageMetric, number>();
    for (const [key, value] of this.daily) {
      const [day, metric] = key.split('|') as [string, UsageMetric];
      if (day >= from && day <= to) {
        const current = totals.get(metric) ?? 0;
        totals.set(
          metric,
          UsageAggregations.isSum(metric)
            ? current + value
            : Math.max(current, value),
        );
      }
    }
    return [...totals].map(([metric, used]) => ({ metric, used }));
  }
}
