import type { CacheAside } from '@platform/cache';

/**
 * `CacheAside` de prueba: guarda las llaves invalidadas y responde las lecturas con una carga directa,
 * sin versiones ni TTL. Basta para comprobar qué invalida el caso de uso y qué lee el adaptador.
 */
export class RecordingCacheAside {
  readonly invalidated: (readonly string[])[] = [];

  getOrLoad<T>(options: { readonly load: () => Promise<T> }): Promise<T> {
    return options.load();
  }

  invalidate(namespace: readonly string[]): Promise<void> {
    this.invalidated.push(namespace);
    return Promise.resolve();
  }

  /** La forma que `SmokeOrderCache` recibe: el mismo objeto, sin más métodos de `CacheAside`. */
  asCacheAside(): CacheAside {
    return this as unknown as CacheAside;
  }
}
