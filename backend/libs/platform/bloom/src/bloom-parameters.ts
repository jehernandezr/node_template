/** Bit array size and number of hash functions of a filter. */
export interface BloomParameters {
  readonly bits: number;
  readonly hashes: number;
}
