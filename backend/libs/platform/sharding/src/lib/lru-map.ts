import { ShardingError, ShardingErrorCode } from './errors.js';

/** Validates a capacity option: a positive safe integer. */
export function assertCapacity(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ShardingError(
      ShardingErrorCode.InvalidConfiguration,
      `${name} must be a positive integer`,
      { details: { option: name } },
    );
  }
}

/**
 * Map with a maximum number of entries. Reading with `get` or writing marks an entry as recently used;
 * when full, a write evicts the least recently used entry and reports it to `onEvict`.
 */
export class LruMap<K, V> {
  private readonly entries = new Map<K, V>();

  constructor(
    readonly maxEntries: number,
    private readonly onEvict?: (key: K, value: V) => void,
  ) {
    assertCapacity('maxEntries', maxEntries);
  }

  get size(): number {
    return this.entries.size;
  }

  /** Returns the value and marks it as recently used. */
  get(key: K): V | undefined {
    if (!this.entries.has(key)) {
      return undefined;
    }
    const value = this.entries.get(key) as V;
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }

  /** Returns the value without changing its position. */
  peek(key: K): V | undefined {
    return this.entries.get(key);
  }

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

  delete(key: K): boolean {
    return this.entries.delete(key);
  }
}

/**
 * Last invalidation sequence per key, bounded. A forgotten key answers with the highest sequence ever
 * evicted, so eviction can only make a load look older than it is (it is then not cached), never newer.
 */
export class InvalidationLog {
  private readonly last: LruMap<string, number>;
  private floor = 0;

  constructor(maxEntries: number) {
    this.last = new LruMap(maxEntries, (_key, sequence) => {
      this.floor = Math.max(this.floor, sequence);
    });
  }

  record(key: string, sequence: number): void {
    this.last.set(key, sequence);
  }

  /** Sequence of the last invalidation of `key`, or an upper bound when it was forgotten. */
  lastFor(key: string): number {
    return this.last.peek(key) ?? this.floor;
  }
}
