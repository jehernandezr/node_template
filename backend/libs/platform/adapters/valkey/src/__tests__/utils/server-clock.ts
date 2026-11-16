import type { Valkey } from 'iovalkey';
import { CachePort } from '@platform/cache';
import { RoutingCache } from '@platform/sharding';

/**
 * Hace determinista un TTL de milisegundos contra un servidor real. Un reloj
 * falso no llega a Valkey y esperar `ttl - 1` ms reales es una carrera con la
 * latencia, así que los TTL se escalan por `SCALE` y `advance` envejece las
 * llaves quitándoles tiempo restante: la latencia real de unos milisegundos
 * queda muy por debajo de un milisegundo virtual.
 */
export class ServerClock {
  static readonly SCALE = 1_000;

  constructor(
    private readonly admin: Valkey,
    private readonly pattern: string,
  ) {}

  /** Envejece cada llave con TTL `virtualMs` milisegundos virtuales; la que llega a 0 vence. */
  async advance(virtualMs: number): Promise<void> {
    const keys = (await this.admin.call('KEYS', this.pattern)) as string[];
    for (const key of keys) {
      const remaining = Number(await this.admin.call('PTTL', key));
      if (remaining < 0) {
        continue;
      }
      const left = remaining - virtualMs * ServerClock.SCALE;
      await (left <= 0
        ? this.admin.call('DEL', key)
        : this.admin.call('PEXPIRE', key, String(left)));
    }
  }

  /** Envuelve un caché para que sus TTL vivan en milisegundos virtuales. */
  scaled(cache: CachePort): CachePort {
    return new ScaledTtlCache(cache);
  }

  /** Envuelve un caché de enrutamiento para que sus TTL vivan en milisegundos virtuales. */
  scaledRouting(cache: RoutingCache): RoutingCache {
    return new ScaledTtlRoutingCache(cache);
  }
}

/** Multiplica cada TTL por {@link ServerClock.SCALE} antes de pasarlo al caché real. */
class ScaledTtlCache extends CachePort {
  constructor(private readonly inner: CachePort) {
    super();
  }

  get(key: string): Promise<string | undefined> {
    return this.inner.get(key);
  }

  set(key: string, value: string, ttlMs?: number): Promise<void> {
    return this.inner.set(
      key,
      value,
      ttlMs === undefined ? undefined : ttlMs * ServerClock.SCALE,
    );
  }

  setIfAbsent(key: string, value: string): Promise<boolean> {
    return this.inner.setIfAbsent(key, value);
  }

  delete(key: string): Promise<void> {
    return this.inner.delete(key);
  }
}

/** Multiplica cada TTL por {@link ServerClock.SCALE} antes de pasarlo al caché de enrutamiento real. */
class ScaledTtlRoutingCache extends RoutingCache {
  constructor(private readonly inner: RoutingCache) {
    super();
  }

  get(key: string): Promise<string | undefined> {
    return this.inner.get(key);
  }

  setIfNewer(
    key: string,
    value: string,
    version: number,
    ttlMs: number,
  ): Promise<boolean> {
    return this.inner.setIfNewer(
      key,
      value,
      version,
      ttlMs * ServerClock.SCALE,
    );
  }

  delete(key: string): Promise<void> {
    return this.inner.delete(key);
  }
}
