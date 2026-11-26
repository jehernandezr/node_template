import type { Clock } from '@platform/kernel';
import { LruMap } from '../lru-map.js';

interface ExpiringEntry<V> {
  readonly value: V;
  readonly expiresAt: number;
}

/** {@link LruMap} whose entries cease to exist when their expiration instant arrives, measured with the `Clock`. */
export class ExpiringLru<V> {
  private readonly entries: LruMap<string, ExpiringEntry<V>>;

  constructor(
    maxEntries: number,
    private readonly clock: Clock,
  ) {
    this.entries = new LruMap(maxEntries);
  }

  /**
   * Current value of the key, or `undefined` if it does not exist or expired (and deletes it).
   * @param key Key to read.
   * @returns The value, or `undefined`.
   */
  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) {
      return undefined;
    }
    if (this.clock.now().getTime() >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Stores a value until it expires.
   * @param expiresAt Epoch instant in milliseconds from which the entry is no longer valid.
   * @param key Key to write.
   * @param value Value to store.
   */
  set(key: string, value: V, expiresAt: number): void {
    this.entries.set(key, { value, expiresAt });
  }

  /**
   * Deletes an entry.
   * @param key Key to delete.
   */
  delete(key: string): void {
    this.entries.delete(key);
  }
}
