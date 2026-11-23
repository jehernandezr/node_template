import {
  UsageAggregation,
  UsageAggregationKind,
  UsageMetric,
} from '@contracts/billing';

/** Cómo se reduce cada métrica a la cifra de un periodo, por el valor del enum. Utilidad pura. */
export class UsageAggregations {
  private static readonly BY_METRIC: Readonly<
    Record<UsageMetric, UsageAggregationKind>
  > = {
    [UsageMetric.Users]: UsageAggregation.users,
    [UsageMetric.ApiCalls]: UsageAggregation.apiCalls,
    [UsageMetric.StorageGb]: UsageAggregation.storageGb,
  };

  static kindOf(metric: UsageMetric): UsageAggregationKind {
    return UsageAggregations.BY_METRIC[metric];
  }

  static isSum(metric: UsageMetric): boolean {
    return UsageAggregations.kindOf(metric) === UsageAggregationKind.Sum;
  }
}
