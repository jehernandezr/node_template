import { LruMap } from '../lru-map.js';

/**
 * Latest invalidation sequence per key, bounded. A forgotten key
 * answers with the highest evicted sequence, so eviction can only
 * make a load look older than it is (and not be cached), never newer.
 */
export class InvalidationLog {
  private readonly last: LruMap<string, number>;
  private floor = 0;
  private sequence = 0;

  constructor(maxEntries: number) {
    this.last = new LruMap(maxEntries, (_key, sequence) => {
      this.floor = Math.max(this.floor, sequence);
    });
  }

  /**
   * Current sequence: that of the last invalidation logged in this log.
   * @returns The sequence.
   */
  current(): number {
    return this.sequence;
  }

  /**
   * Logs an invalidation of `key` and returns its sequence.
   * @param key Invalidated key.
   * @returns The sequence.
   */
  mark(key: string): number {
    this.sequence += 1;
    this.last.set(key, this.sequence);
    return this.sequence;
  }

  /**
   * Sequence of the last invalidation of `key`, or an upper bound if it was forgotten.
   * @param key Key to read.
   * @returns The sequence.
   */
  lastFor(key: string): number {
    return this.last.peek(key) ?? this.floor;
  }

  /**
   * `true` when no invalidation of `key` was logged after `sequence`.
   * @param key Key to check.
   * @param sequence Sequence of the read.
   * @returns `true` when still current.
   */
  isCurrent(key: string, sequence: number): boolean {
    return this.lastFor(key) <= sequence;
  }
}
