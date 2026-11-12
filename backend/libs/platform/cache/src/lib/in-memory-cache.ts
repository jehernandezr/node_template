import type { CachePort } from './cache-port.js';

/** Options for {@link InMemoryCache}. */
export interface InMemoryCacheOptions {
  /** Clock in milliseconds. Defaults to `Date.now`. */
  clock?: () => number;
}

interface Entry {
  value: string;
  /** Absolute expiry in clock milliseconds, or `undefined` when the entry never expires. */
  expiresAt: number | undefined;
}

/** Process-local {@link CachePort} with TTL expiry. Useful for tests and single-instance setups. */
export class InMemoryCache implements CachePort {
  private readonly entries = new Map<string, Entry>();
  private readonly clock: () => number;

  constructor(options: InMemoryCacheOptions = {}) {
    this.clock = options.clock ?? Date.now;
  }

  async get(key: string): Promise<string | undefined> {
    return this.live(key)?.value;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    this.entries.set(key, {
      value,
      expiresAt: ttlMs === undefined ? undefined : this.clock() + ttlMs,
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

  async incr(key: string): Promise<number> {
    const current = this.live(key) ?? { value: '0', expiresAt: undefined };
    const next = Number(current.value) + 1;
    if (!Number.isSafeInteger(next)) {
      throw new TypeError(`Value at "${key}" is not an integer counter`);
    }
    this.entries.set(key, {
      value: String(next),
      expiresAt: current.expiresAt,
    });
    return next;
  }

  /** Returns the entry if it has not expired, dropping it otherwise. */
  private live(key: string): Entry | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) {
      return undefined;
    }
    if (entry.expiresAt !== undefined && this.clock() >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }
}
