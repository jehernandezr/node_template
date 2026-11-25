/**
 * Storage port of the query cache. Values are opaque
 * text. All its members are abstract, so an object literal with those
 * methods still works as a double.
 */
export abstract class CachePort {
  /** Returns the stored value, or `undefined` if it does not exist or expired. */
  abstract get(key: string): Promise<string | undefined>;

  /** Stores a value. It expires after `ttlMs` milliseconds, or never if omitted. */
  abstract set(key: string, value: string, ttlMs?: number): Promise<void>;

  /** Stores only if the key does not exist or expired. Returns `true` if it stored. */
  abstract setIfAbsent(key: string, value: string): Promise<boolean>;

  /** Deletes the key if it exists. */
  abstract delete(key: string): Promise<void>;
}
