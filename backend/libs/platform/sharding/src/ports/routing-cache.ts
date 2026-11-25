/** Cache shared across processes (for example Valkey). Values are JSON strings. */
export abstract class RoutingCache {
  abstract get(key: string): Promise<string | undefined>;

  /**
   * Writes only if the key does not exist, expired, or the stored version is lower;
   * an equal version is rejected. Must be atomic: `ShardRouter` relies on
   * it so that an older placement does not overwrite a tombstone.
   * @returns `true` if it wrote.
   */
  abstract setIfNewer(
    key: string,
    value: string,
    version: number,
    ttlMs: number,
  ): Promise<boolean>;

  /** Deletes the key. `ShardRouter` does not call it: invalidations write a versioned tombstone. */
  abstract delete(key: string): Promise<void>;
}
