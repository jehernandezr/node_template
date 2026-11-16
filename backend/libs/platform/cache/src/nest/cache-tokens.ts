/** Token de las opciones de `CacheModule`, que lee `CacheProviders`. */
export const CACHE_OPTIONS = Symbol('CACHE_OPTIONS');

/** Token del puerto de métricas del caché, presente solo si el módulo recibe métricas. */
export const CACHE_METRICS = Symbol('CACHE_METRICS');

/** Tokens de inyección que dependen de un nombre, como el de un espacio de caché. */
export class CacheTokens {
  /** Token del `CacheAside` de un espacio de nombres. Es el mismo en cada llamada con ese nombre. */
  static aside(namespace: string): symbol {
    return Symbol.for(`platform.cache.aside.${namespace}`);
  }
}

/** Token del `CacheAside` de un espacio de nombres. */
export const cacheAsideToken = CacheTokens.aside;
