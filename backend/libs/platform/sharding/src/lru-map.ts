import { ShardingGuard } from './errors/sharding-guard.js';

/**
 * Map with a maximum number of entries. Reading with `get` or writing marks the entry
 * as most recently used; when full, a write evicts the least recent one and
 * reports it to `onEvict`.
 */
export class LruMap<K, V> {
  private readonly entries = new Map<K, V>();

  /** @throws ShardingError `InvalidConfiguration` if `maxEntries` is not a positive integer. */
  constructor(
    readonly maxEntries: number,
    private readonly onEvict?: (key: K, value: V) => void,
  ) {
    ShardingGuard.instance.positiveInteger('maxEntries', maxEntries);
  }

  /** Number of entries. */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Returns the value and marks it as most recently used.
   * @param key Key to read.
   * @returns The value, or `undefined`.
   */
  get(key: K): V | undefined {
    if (!this.entries.has(key)) {
      return undefined;
    }
    const value = this.entries.get(key) as V;
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }

  /**
   * Returns the value without changing its position.
   * @param key Key to read.
   * @returns The value, or `undefined`.
   */
  peek(key: K): V | undefined {
    return this.entries.get(key);
  }

  /**
   * Stores a value as the most recent, evicting the least recent beyond the capacity.
   * @param key Key to write.
   * @param value Value to store.
   */
  set(key: K, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done === true) {
        return;
      }
      const evicted = this.entries.get(oldest.value) as V;
      this.entries.delete(oldest.value);
      this.onEvict?.(oldest.value, evicted);
    }
  }

  /**
   * Deletes an entry.
   * @param key Key to delete.
   * @returns Whether it existed.
   */
  delete(key: K): boolean {
    return this.entries.delete(key);
  }
}
