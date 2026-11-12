import { SystemClock, type Clock } from '@platform/kernel';
import type { CachePort } from './cache-port.js';
import { CacheNotACounterError } from './errors.js';

/** Options for {@link InMemoryCache}. */
export interface InMemoryCacheOptions {
  /**
   * Time source. Defaults to `SystemClock`.
   * A function returning epoch milliseconds is still accepted but deprecated:
   * pass a kernel `Clock` (for tests, `FixedClock` from `@platform/kernel/testing`).
   */
  clock?: Clock | (() => number);
}

interface Entry {
  value: string;
  /** Absolute expiry in clock milliseconds, or `undefined` when the entry never expires. */
  expiresAt: number | undefined;
}

function toMillis(clock: Clock | (() => number) | undefined): () => number {
  if (clock === undefined) {
    const system = new SystemClock();
    return () => system.now().getTime();
  }
  if (typeof clock === 'function') {
    return clock;
  }
  return () => clock.now().getTime();
}

/** Process-local {@link CachePort} with TTL expiry. Useful for tests and single-instance setups. */
export class InMemoryCache implements CachePort {
  private readonly entries = new Map<string, Entry>();
  private readonly now: () => number;

  constructor(options: InMemoryCacheOptions = {}) {
    this.now = toMillis(options.clock);
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

  /** @throws CacheNotACounterError when the stored value is not an integer. */
  async incr(key: string): Promise<number> {
    const current = this.live(key) ?? { value: '0', expiresAt: undefined };
    const next = Number(current.value) + 1;
    if (!Number.isSafeInteger(next)) {
      throw new CacheNotACounterError();
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
    if (entry.expiresAt !== undefined && this.now() >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }
}
