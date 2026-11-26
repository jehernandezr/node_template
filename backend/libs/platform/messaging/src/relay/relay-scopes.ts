/**
 * Iterates over the partitions whose outbox must be published without
 * messaging knowing the persistence. With shards, the Postgres adapter
 * provides a version that runs `body` once per shard.
 */
export abstract class RelayScopes {
  /**
   * Runs `body` once for each partition whose outbox must be published.
   * @param body Work of one partition.
   */
  abstract forEach(body: () => Promise<void>): Promise<void>;
}
