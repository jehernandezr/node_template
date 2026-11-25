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
  /** Stores the record if its key is new. Returns `false` if it was already recorded. */
  abstract claim(usage: MeteredUsage): Promise<boolean>;

  /** Adds the quantity to the day, or keeps the larger value if the metric is reduced by maximum. */
  abstract accumulate(
    day: string,
    metric: UsageMetric,
    quantity: number,
  ): Promise<void>;

  /** Returns the usage per metric between `from` and `to` (dates inclusive), according to how each one is reduced. */
  abstract levels(from: string, to: string): Promise<readonly UsageLevel[]>;
}
