/**
 * Short-lived identity data (challenges, pending authentications, counters, nonces). Each
 * operation is atomic on the server, so two replicas cannot use the same value twice.
 */
export abstract class EphemeralStore {
  abstract get(key: string): Promise<string | undefined>;

  abstract set(key: string, value: string, ttlMs: number): Promise<void>;

  /** Stores only if the key does not exist. Returns `true` if it stored it. */
  abstract setIfAbsent(
    key: string,
    value: string,
    ttlMs: number,
  ): Promise<boolean>;

  /** Reads and deletes in a single step: the value is used once. */
  abstract take(key: string): Promise<string | undefined>;

  abstract delete(key: string): Promise<void>;

  /** Adds one and returns the new value. The lifetime runs from the first increment. */
  abstract increment(key: string, ttlMs: number): Promise<number>;

  /**
   * Extends the lifetime of an existing key to `ttlMs` from now, never shortening it. A key that does not
   * exist still does not exist.
   */
  abstract extend(key: string, ttlMs: number): Promise<void>;

  /** Milliseconds the key has left, or `undefined` if it does not exist. */
  abstract remainingMs(key: string): Promise<number | undefined>;

  /** Stores a field of a map; each write renews the lifetime of the whole map. */
  abstract putField(
    key: string,
    field: string,
    value: string,
    ttlMs: number,
  ): Promise<void>;

  /** Reads and deletes the map in a single step: what is written afterwards is kept for the next read. */
  abstract takeFields(key: string): Promise<ReadonlyMap<string, string>>;
}
