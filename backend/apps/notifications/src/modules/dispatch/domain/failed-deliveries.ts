import type { Delivery } from './delivery.js';

/** The pending or failed deliveries of all shards. */
export abstract class FailedDeliveries {
  /**
   * Those that can already be retried at `now`, the most overdue first, up to `limit`.
   * @param now Current instant.
   * @param limit Maximum to return.
   * @returns The deliveries to retry.
   */
  abstract due(now: Date, limit: number): Promise<readonly Delivery[]>;
}
