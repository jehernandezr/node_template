/** Cache shared across processes (for example Valkey). Values are JSON strings. */
export abstract class RoutingCache {
  /**
   * Reads a routing key from the shared cache.
   * @param key Cache key.
   * @returns The value, or `undefined`.
   */
  abstract get(key: string): Promise<string | undefined>;

  /**
   * Writes only if the key does not exist, expired, or the stored version is lower;
   * an equal version is rejected. Must be atomic: `ShardRouter` relies on
   * it so that an older placement does not overwrite a tombstone.
   * @returns `true` if it wrote.
   * @param key Cache key.
   * @param value Value to store.
   * @param version Version of the value.
   * @param ttlMs Lifetime.
   */
  abstract setIfNewer(
    key: string,
    value: string,
    version: number,
    ttlMs: number,
  ): Promise<boolean>;

  /**
   * Deletes the key. `ShardRouter` does not call it: invalidations write a versioned tombstone.
   * @param key Cache key.
   */
  abstract delete(key: string): Promise<void>;
}
