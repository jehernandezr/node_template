/** Token of the `BloomModule` options, read by `BloomProviders`. */
export const BLOOM_OPTIONS = Symbol('BLOOM_OPTIONS');

/** Injection tokens that depend on a filter's name. */
export class BloomTokens {
  /** Returns the token of the filter with that name. */
  static filter(name: string): symbol {
    return Symbol.for(`platform.bloom.filter.${name}`);
  }

  /** Returns the token of the rebuild job of the filter with that name. */
  static rebuildJob(name: string): symbol {
    return Symbol.for(`platform.bloom.rebuild-job.${name}`);
  }
}

/** Returns the token of the filter with that name. */
export const bloomFilterToken = BloomTokens.filter;

/** Returns the token of the rebuild job of the filter with that name. */
export const bloomRebuildJobToken = BloomTokens.rebuildJob;
