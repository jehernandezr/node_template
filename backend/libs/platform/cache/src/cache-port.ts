/**
 * Storage port of the query cache. Values are opaque
 * text. All its members are abstract, so an object literal with those
 * methods still works as a double.
 */
export abstract class CachePort {
  /**
   * Returns the stored value, or `undefined` if it does not exist or expired.
   * @param key Key to read.
   * @returns The value, or `undefined`.
   */
  abstract get(key: string): Promise<string | undefined>;

  /**
   * Stores a value. It expires after `ttlMs` milliseconds, or never if omitted.
   * @param key Key to write.
   * @param value Value to store.
   * @param ttlMs Lifetime in milliseconds.
   */
  abstract set(key: string, value: string, ttlMs?: number): Promise<void>;

  /**
   * Stores only if the key does not exist or expired. Returns `true` if it stored.
   * @param key Key to write.
   * @param value Value to store.
   * @returns Whether it stored.
   */
  abstract setIfAbsent(key: string, value: string): Promise<boolean>;

  /**
   * Deletes the key if it exists.
   * @param key Key to delete.
   */
  abstract delete(key: string): Promise<void>;
}
