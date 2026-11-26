import { type Clock } from '@platform/kernel';
import { CachePort } from './cache-port.js';
import type { InMemoryCacheOptions } from './in-memory-cache.options.js';

interface Entry {
  readonly value: string;
  /** Expiration instant in clock milliseconds, or `undefined` if it never expires. */
  readonly expiresAt: number | undefined;
}

/**
 * In-process `CachePort`, with TTL expiration. Useful for tests and
 * for single-instance deployments.
 */
export class InMemoryCache extends CachePort {
  private readonly entries = new Map<string, Entry>();
  private readonly clock: Clock;

  constructor(options: InMemoryCacheOptions) {
    super();
    this.clock = options.clock;
  }

  async get(key: string): Promise<string | undefined> {
    return this.live(key)?.value;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    this.entries.set(key, {
      value,
      expiresAt: ttlMs === undefined ? undefined : this.now() + ttlMs,
    });
  }

  async setIfAbsent(key: string, value: string): Promise<boolean> {
    if (this.live(key) !== undefined) {
      return false;
    }
    this.entries.set(key, { value, expiresAt: undefined });
    return true;
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  /** Returns the entry if it has not expired; if it has, deletes it. */
  private live(key: string): Entry | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) {
      return undefined;
    }
    if (entry.expiresAt !== undefined && this.now() >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  private now(): number {
    return this.clock.now().getTime();
  }
}
