/** Queries over the subscriptions of all tenants, across all shards, for the jobs. */
export abstract class SubscriptionMaintenance {
  /** Tenants whose subscription ended its period before `today` and is neither suspended nor canceled. */
  abstract dueForClosing(today: string): Promise<readonly string[]>;
  /** Tenants past due since before `cutoff`. */
  abstract pastDueBefore(cutoff: Date): Promise<readonly string[]>;
}
