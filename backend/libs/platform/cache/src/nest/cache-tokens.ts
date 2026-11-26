/** Token of the `CacheModule` options, read by `CacheProviders`. */
export const CACHE_OPTIONS = Symbol('CACHE_OPTIONS');

/** Token of the cache metrics port, present only if the module receives metrics. */
export const CACHE_METRICS = Symbol('CACHE_METRICS');

/** Injection tokens that depend on a name, such as that of a cache namespace. */
export class CacheTokens {
  /**
   * Returns the token of the `CacheAside` of a namespace. It is the same on every call with that name.
   * @param namespace Cache namespace.
   * @returns The token.
   */
  static aside(namespace: string): symbol {
    return Symbol.for(`platform.cache.aside.${namespace}`);
  }
}

/** Returns the token of the `CacheAside` of a namespace. */
export const cacheAsideToken = CacheTokens.aside;
