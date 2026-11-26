import {
  UsageAggregation,
  UsageAggregationKind,
  UsageMetric,
} from '@contracts/billing';

/** How each metric is reduced to a single figure for a period, by enum value. Pure utility. */
export class UsageAggregations {
  private static readonly BY_METRIC: Readonly<
    Record<UsageMetric, UsageAggregationKind>
  > = {
    [UsageMetric.Users]: UsageAggregation.users,
    [UsageMetric.ApiCalls]: UsageAggregation.apiCalls,
    [UsageMetric.StorageGb]: UsageAggregation.storageGb,
  };

  /**
   * Tells how a metric is reduced over a period.
   * @param metric Metric to read.
   * @returns Sum or maximum.
   */
  static kindOf(metric: UsageMetric): UsageAggregationKind {
    return UsageAggregations.BY_METRIC[metric];
  }

  /**
   * Tells whether a metric adds up over a period.
   * @param metric Metric to read.
   * @returns `true` for summed metrics.
   */
  static isSum(metric: UsageMetric): boolean {
    return UsageAggregations.kindOf(metric) === UsageAggregationKind.Sum;
  }
}
