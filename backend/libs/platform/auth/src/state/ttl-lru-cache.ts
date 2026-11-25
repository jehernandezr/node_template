/** An entry with the instant it was read. */
export interface TtlEntry<V> {
  readonly value: V;
  readonly storedAtMs: number;
}

/**
 * Bounded in-memory cache: the least used entry is evicted when exceeding
 * `maxEntries`. It does not delete expired entries: the reader decides whether an expired entry
 * is usable, for example when Valkey does not respond.
 */
export class TtlLruCache<V> {
  private readonly entries = new Map<string, TtlEntry<V>>();

  constructor(private readonly maxEntries: number) {}

  /** Returns the entry, expired or not, and marks it as the most recent. */
  get(key: string): TtlEntry<V> | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) {
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry;
  }

  set(key: string, value: V, nowMs: number): void {
    this.entries.delete(key);
    this.entries.set(key, { value, storedAtMs: nowMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) {
        return;
      }
      this.entries.delete(oldest);
    }
  }

  /** `true` if the entry was stored less than `ttlMs` ago. */
  isFresh(entry: TtlEntry<V>, nowMs: number, ttlMs: number): boolean {
    return nowMs - entry.storedAtMs < ttlMs;
  }
}
