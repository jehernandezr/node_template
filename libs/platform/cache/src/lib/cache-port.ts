/** Storage contract for the query cache. Values are opaque strings. */
export interface CachePort {
  /** Returns the stored value, or `undefined` when missing or expired. */
  get(key: string): Promise<string | undefined>;
  /** Stores a value. It expires after `ttlMs` milliseconds, or never when `ttlMs` is omitted. */
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  /** Stores a value only when the key is missing or expired. Returns true when it was stored. */
  setIfAbsent(key: string, value: string): Promise<boolean>;
  /** Removes a key if present. */
  delete(key: string): Promise<void>;
  /** Increments a counter, creating it at 0 first when missing. The new key has no TTL. */
  incr(key: string): Promise<number>;
}
