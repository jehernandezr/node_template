import { SystemClock, type Clock } from '@platform/kernel';
import { CachePort } from './cache-port.js';
import type { InMemoryCacheOptions } from './in-memory-cache.options.js';

interface Entry {
  readonly value: string;
  /** Instante de vencimiento en milisegundos del reloj, o `undefined` si nunca vence. */
  readonly expiresAt: number | undefined;
}

/**
 * `CachePort` en el mismo proceso, con vencimiento por TTL. Sirve para pruebas y
 * para instalaciones de una sola instancia.
 */
export class InMemoryCache extends CachePort {
  private readonly entries = new Map<string, Entry>();
  private readonly clock: Clock;

  constructor(options: InMemoryCacheOptions = {}) {
    super();
    this.clock = options.clock ?? new SystemClock();
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

  /** Devuelve la entrada si no venció; si venció, la borra. */
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
