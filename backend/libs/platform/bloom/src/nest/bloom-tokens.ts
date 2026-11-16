/** Token de las opciones de `BloomModule`, que lee `BloomProviders`. */
export const BLOOM_OPTIONS = Symbol('BLOOM_OPTIONS');

/** Tokens de inyección que dependen del nombre de un filtro. */
export class BloomTokens {
  /** Token del filtro con ese nombre. */
  static filter(name: string): symbol {
    return Symbol.for(`platform.bloom.filter.${name}`);
  }

  /** Token del job de reconstrucción del filtro con ese nombre. */
  static rebuildJob(name: string): symbol {
    return Symbol.for(`platform.bloom.rebuild-job.${name}`);
  }
}

/** Token del filtro con ese nombre. */
export const bloomFilterToken = BloomTokens.filter;

/** Token del job de reconstrucción del filtro con ese nombre. */
export const bloomRebuildJobToken = BloomTokens.rebuildJob;
