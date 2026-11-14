import type { BloomHashScheme } from './bloom-hash-scheme.enum.js';
import type { BloomParameters } from './bloom-parameters.js';

/** Versión del formato serializado que entiende esta librería. */
export const BLOOM_FORMAT_VERSION = 1 as const;

/** Representación con tipos simples de un filtro. `data` es el arreglo de bits en base64 canónico. */
export interface SerializedBloomFilter extends BloomParameters {
  readonly version: typeof BLOOM_FORMAT_VERSION;
  readonly scheme: BloomHashScheme;
  readonly data: string;
}
