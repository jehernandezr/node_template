import type { UsageMetric } from '@contracts/billing';

/** A usage record that arrived from a metering service, with its idempotency key. */
export interface MeteredUsage {
  readonly id: string;
  readonly key: string;
  readonly metric: UsageMetric;
  readonly quantity: number;
  readonly windowStart: Date;
}

/** The usage of a metric over a range of days. */
export interface UsageLevel {
  readonly metric: UsageMetric;
  readonly used: number;
}

/** Usage of the tenant of the open `ShardScope`: records by key and totals per day. */
export abstract class UsageLedger {
  /**
   * Stores the record if its key is new. Returns `false` if it was already recorded.
   * @param usage Record with its idempotency key.
   * @returns `true` when it was new.
   */
  abstract claim(usage: MeteredUsage): Promise<boolean>;

  /**
   * Adds the quantity to the day, or keeps the larger value if the metric is reduced by maximum.
   * @param day Day of the usage, `YYYY-MM-DD`.
   * @param metric Metric used.
   * @param quantity Units used.
   */
  abstract accumulate(
    day: string,
    metric: UsageMetric,
    quantity: number,
  ): Promise<void>;

  /**
   * Returns the usage per metric between `from` and `to` (dates inclusive), according to how each one is reduced.
   * @param from First day.
   * @param to Last day.
   * @returns The usage of each metric.
   */
  abstract levels(from: string, to: string): Promise<readonly UsageLevel[]>;
}
