/**
 * Short-lived identity data (challenges, pending authentications, counters, nonces). Each
 * operation is atomic on the server, so two replicas cannot use the same value twice.
 */
export abstract class EphemeralStore {
  /**
   * Reads a value.
   * @param key Key to read.
   * @returns The value, or `undefined` when missing or expired.
   */
  abstract get(key: string): Promise<string | undefined>;

  /**
   * Stores a value that expires after `ttlMs`.
   * @param key Key to write.
   * @param value Value to store.
   * @param ttlMs Lifetime in milliseconds.
   */
  abstract set(key: string, value: string, ttlMs: number): Promise<void>;

  /**
   * Stores only if the key does not exist. Returns `true` if it stored it.
   * @param key Key to write.
   * @param value Value to store.
   * @param ttlMs Lifetime in milliseconds.
   * @returns Whether it stored it.
   */
  abstract setIfAbsent(
    key: string,
    value: string,
    ttlMs: number,
  ): Promise<boolean>;

  /**
   * Reads and deletes in a single step: the value is used once.
   * @param key Key to take.
   * @returns The value, or `undefined` when missing.
   */
  abstract take(key: string): Promise<string | undefined>;

  /**
   * Deletes a key; nothing happens when it is missing.
   * @param key Key to delete.
   */
  abstract delete(key: string): Promise<void>;

  /**
   * Adds one and returns the new value. The lifetime runs from the first increment.
   * @param key Counter key.
   * @param ttlMs Lifetime from the first increment.
   * @returns The new value.
   */
  abstract increment(key: string, ttlMs: number): Promise<number>;

  /**
   * Extends the lifetime of an existing key to `ttlMs` from now, never shortening it. A key that does not
   * exist still does not exist.
   * @param key Key to extend.
   * @param ttlMs New minimum lifetime from now.
   */
  abstract extend(key: string, ttlMs: number): Promise<void>;

  /**
   * Milliseconds the key has left, or `undefined` if it does not exist.
   * @param key Key to read.
   * @returns The remaining milliseconds, or `undefined`.
   */
  abstract remainingMs(key: string): Promise<number | undefined>;

  /**
   * Stores a field of a map; each write renews the lifetime of the whole map.
   * @param key Map key.
   * @param field Field of the map.
   * @param value Value of the field.
   * @param ttlMs Lifetime of the map.
   */
  abstract putField(
    key: string,
    field: string,
    value: string,
    ttlMs: number,
  ): Promise<void>;

  /**
   * Reads and deletes the map in a single step: what is written afterwards is kept for the next read.
   * @param key Map key.
   * @returns The fields that were stored.
   */
  abstract takeFields(key: string): Promise<ReadonlyMap<string, string>>;
}
