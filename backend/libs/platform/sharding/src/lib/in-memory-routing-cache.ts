import type { RoutingCache } from './ports.js';

interface StoredValue {
  readonly value: string;
  readonly version: number;
  readonly expiresAt: number;
}

/** In-memory {@link RoutingCache} with TTL. Useful for tests and single-process setups. */
export class InMemoryRoutingCache implements RoutingCache {
  private readonly entries = new Map<string, StoredValue>();
  private readonly clock: () => number;

  /** @param clock Time source in milliseconds. Default `Date.now`. */
  constructor(clock: () => number = () => Date.now()) {
    this.clock = clock;
  }

  async get(key: string): Promise<string | undefined> {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }
    if (this.clock() >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async setIfNewer(
    key: string,
    value: string,
    version: number,
    ttlMs: number,
  ): Promise<boolean> {
    const now = this.clock();
    const existing = this.entries.get(key);
    if (existing && now < existing.expiresAt && existing.version >= version) {
      return false;
    }
    this.entries.set(key, { value, version, expiresAt: now + ttlMs });
    return true;
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }
}
