/** Token of the `BloomModule` options, read by `BloomProviders`. */
export const BLOOM_OPTIONS = Symbol('BLOOM_OPTIONS');

/** Injection tokens that depend on a filter's name. */
export class BloomTokens {
  /**
   * Injection token of one named Bloom filter, the same symbol on every call.
   * @param name Filter name.
   * @returns The token.
   */
  static filter(name: string): symbol {
    return Symbol.for(`platform.bloom.filter.${name}`);
  }

  /**
   * Returns the token of the rebuild job of the filter with that name.
   * @param name Filter name.
   * @returns The token.
   */
  static rebuildJob(name: string): symbol {
    return Symbol.for(`platform.bloom.rebuild-job.${name}`);
  }
}

/** Returns the token of the filter with that name. */
export const bloomFilterToken = BloomTokens.filter;

/** Returns the token of the rebuild job of the filter with that name. */
export const bloomRebuildJobToken = BloomTokens.rebuildJob;
