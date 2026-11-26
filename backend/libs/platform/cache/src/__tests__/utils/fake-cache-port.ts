import { FixedClock } from '@platform/kernel/test-utils';
import { CachePort } from '../../cache-port.js';

interface Stored {
  readonly value: string;
  readonly expiresAt: number | undefined;
}

/**
 * Test `CachePort` with a fixed clock for expirations. Counts the
 * operations in public counters and can go down with `fail` to simulate
 * an unreachable cache.
 */
export class FakeCachePort extends CachePort {
  gets = 0;
  sets = 0;
  deletes = 0;
  private readonly entries = new Map<string, Stored>();
  private failure: Error | undefined;

  constructor(readonly clock: FixedClock = new FixedClock()) {
    super();
  }

  /** Makes every operation reject with `error` until `recover`. */
  fail(error: Error = new Error('cache down')): void {
    this.failure = error;
  }

  /** Vuelve a responder normalmente. */
  recover(): void {
    this.failure = undefined;
  }

  override async get(key: string): Promise<string | undefined> {
    this.gets += 1;
    this.throwIfFailing();
    return this.live(key)?.value;
  }

  override async set(
    key: string,
    value: string,
    ttlMs?: number,
  ): Promise<void> {
    this.sets += 1;
    this.throwIfFailing();
    this.entries.set(key, {
      value,
      expiresAt: ttlMs === undefined ? undefined : this.now() + ttlMs,
    });
  }

  override async setIfAbsent(key: string, value: string): Promise<boolean> {
    this.throwIfFailing();
    if (this.live(key) !== undefined) {
      return false;
    }
    this.entries.set(key, { value, expiresAt: undefined });
    return true;
  }

  override async delete(key: string): Promise<void> {
    this.deletes += 1;
    this.throwIfFailing();
    this.entries.delete(key);
  }

  private live(key: string): Stored | undefined {
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

  private throwIfFailing(): void {
    if (this.failure !== undefined) {
      throw this.failure;
    }
  }
}
