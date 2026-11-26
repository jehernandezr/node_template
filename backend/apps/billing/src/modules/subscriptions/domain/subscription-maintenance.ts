/** Queries over the subscriptions of all tenants, across all shards, for the jobs. */
export abstract class SubscriptionMaintenance {
  /**
   * Tenants whose subscription ended its period before `today` and is neither suspended nor canceled.
   * @param today Date, `YYYY-MM-DD` in UTC.
   * @returns Ids of the tenants due for closing.
   */
  abstract dueForClosing(today: string): Promise<readonly string[]>;
  /**
   * Tenants past due since before `cutoff`.
   * @param cutoff Instant the past due state must predate.
   * @returns Ids of the tenants to suspend.
   */
  abstract pastDueBefore(cutoff: Date): Promise<readonly string[]>;
}
