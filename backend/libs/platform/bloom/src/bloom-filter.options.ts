import type { BloomParameters } from './bloom-parameters.js';

/** Opciones del constructor de `BloomFilter`. */
export interface BloomFilterOptions extends BloomParameters {
  /** Arreglo de bits crudo. Debe medir exactamente `ceil(bits / 8)` bytes con los bits sobrantes en cero. Se copia al construir. */
  readonly data?: Uint8Array;
}

/** Opciones de `BloomFilter.create`. */
export interface CreateBloomFilterOptions {
  readonly expectedItems: number;
  /** Por defecto `BloomSizing.DEFAULT_FALSE_POSITIVE_RATE` (1 %). */
  readonly falsePositiveRate?: number;
}
