import type { BloomParameters } from './bloom-parameters.js';

/** `BloomFilter` constructor options. */
export interface BloomFilterOptions extends BloomParameters {
  /** Raw bit array. Must be exactly `ceil(bits / 8)` bytes long with the leftover bits at zero. Copied on construction. */
  readonly data?: Uint8Array;
}

/** Options of `BloomFilter.create`. */
export interface CreateBloomFilterOptions {
  readonly expectedItems: number;
  /** Defaults to `BloomSizing.DEFAULT_FALSE_POSITIVE_RATE` (1 %). */
  readonly falsePositiveRate?: number;
}
