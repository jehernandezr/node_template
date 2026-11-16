import { SystemClock, type Clock } from '@platform/kernel';
import { RoutingCache } from '../../ports/routing-cache.js';

interface StoredValue {
  readonly value: string;
  readonly version: number;
  readonly expiresAt: number;
}

/** {@link RoutingCache} en memoria con TTL. Sirve para pruebas y para configuraciones de un solo proceso. */
export class InMemoryRoutingCache implements RoutingCache {
  private readonly entries = new Map<string, StoredValue>();
  private readonly clock: Clock;

  /** @param clock Fuente de tiempo. Por defecto, el reloj del sistema. */
  constructor(clock: Clock = new SystemClock()) {
    this.clock = clock;
  }

  async get(key: string): Promise<string | undefined> {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }
    if (this.clock.now().getTime() >= entry.expiresAt) {
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
    const now = this.clock.now().getTime();
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
