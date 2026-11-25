import type { BloomHashScheme } from './bloom-hash-scheme.enum.js';
import type { BloomParameters } from './bloom-parameters.js';

/** Version of the serialized format this library understands. */
export const BLOOM_FORMAT_VERSION = 1 as const;

/** Plain-typed representation of a filter. `data` is the bit array in canonical base64. */
export interface SerializedBloomFilter extends BloomParameters {
  readonly version: typeof BLOOM_FORMAT_VERSION;
  readonly scheme: BloomHashScheme;
  readonly data: string;
}
