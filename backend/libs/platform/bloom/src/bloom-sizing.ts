import { BloomGuard } from './errors/bloom-guard.js';
import { InvalidParametersError } from './errors/invalid-parameters.error.js';
import type { BloomParameters } from './bloom-parameters.js';

/** Dimensionado de filtros: bits, funciones de hash y particiones para una tasa de falsos positivos. */
export class BloomSizing {
  /** Mínimo de bits permitido. */
  static readonly MIN_BITS = 1;
  /**
   * Mayor tamaño de arreglo permitido (2^32 bits, 512 MiB), igual que la cadena más grande de Valkey.
   * A la tasa por defecto de 1 % cabe cerca de 448 millones de ítems: un conjunto mayor, como la lista
   * de contraseñas de Have I Been Pwned (más de mil millones de hashes), se reparte entre varios filtros
   * con `PartitionedBloomFilter`.
   */
  static readonly MAX_BITS = 2 ** 32;
  /** Mínimo de funciones de hash. */
  static readonly MIN_HASHES = 1;
  /** Máximo de funciones de hash. */
  static readonly MAX_HASHES = 32;
  /** Máximo de particiones de un filtro partido. */
  static readonly MAX_PARTITIONS = 4_096;
  /** Tasa de falsos positivos de un filtro que no declara una (1 %). */
  static readonly DEFAULT_FALSE_POSITIVE_RATE = 0.01;

  /**
   * Bits que necesita un filtro óptimo, sin el tope de `MAX_BITS`: m = ceil(-n * ln p / (ln 2)^2).
   * Sirve para dimensionar particiones cuando un solo filtro no alcanza (ver `partitionCount`).
   * @throws InvalidParametersError cuando un argumento está fuera de rango.
   */
  static requiredBits(
    expectedItems: number,
    falsePositiveRate: number = BloomSizing.DEFAULT_FALSE_POSITIVE_RATE,
  ): number {
    BloomGuard.instance.positiveInteger('expectedItems', expectedItems);
    BloomSizing.assertRate(falsePositiveRate);
    const ln2 = Math.LN2;
    return Math.ceil(
      (-expectedItems * Math.log(falsePositiveRate)) / (ln2 * ln2),
    );
  }

  /**
   * Tamaño del arreglo y número de funciones de hash para una tasa objetivo.
   * m = ceil(-n * ln p / (ln 2)^2), k = max(1, round(m / n * ln 2)).
   * @throws InvalidParametersError cuando un argumento está fuera de rango o el
   *   resultado excede los límites (bits en [1, 2^32], funciones de hash en [1, 32]).
   */
  static optimalParameters(
    expectedItems: number,
    falsePositiveRate: number = BloomSizing.DEFAULT_FALSE_POSITIVE_RATE,
  ): BloomParameters {
    const bits = BloomSizing.requiredBits(expectedItems, falsePositiveRate);
    const hashes = Math.max(1, Math.round((bits / expectedItems) * Math.LN2));
    BloomGuard.instance.integerInRange(
      'bits',
      bits,
      BloomSizing.MIN_BITS,
      BloomSizing.MAX_BITS,
    );
    BloomGuard.instance.integerInRange(
      'hashes',
      hashes,
      BloomSizing.MIN_HASHES,
      BloomSizing.MAX_HASHES,
    );
    return { bits, hashes };
  }

  /**
   * Particiones necesarias para que cada una quepa en `maxBitsPerPartition` con la tasa objetivo.
   * Por ejemplo, 1 500 millones de ítems al 1 % necesitan unos 14 400 millones de bits: 4 particiones
   * de como mucho 2^32 bits.
   * @throws InvalidParametersError para argumentos fuera de rango, o cuando hacen falta más de `MAX_PARTITIONS`.
   */
  static partitionCount(
    expectedItems: number,
    falsePositiveRate: number = BloomSizing.DEFAULT_FALSE_POSITIVE_RATE,
    maxBitsPerPartition: number = BloomSizing.MAX_BITS,
  ): number {
    BloomGuard.instance.integerInRange(
      'maxBitsPerPartition',
      maxBitsPerPartition,
      BloomSizing.MIN_BITS,
      BloomSizing.MAX_BITS,
    );
    const count = Math.ceil(
      BloomSizing.requiredBits(expectedItems, falsePositiveRate) /
        maxBitsPerPartition,
    );
    if (count > BloomSizing.MAX_PARTITIONS) {
      throw new InvalidParametersError(
        `${count} partitions needed; the maximum is ${BloomSizing.MAX_PARTITIONS}`,
      );
    }
    return count;
  }

  private static assertRate(falsePositiveRate: number): void {
    if (!(falsePositiveRate > 0 && falsePositiveRate < 1)) {
      throw new InvalidParametersError(
        `falsePositiveRate must be in (0, 1), got ${falsePositiveRate}`,
      );
    }
  }
}
