import { AsyncBloomFilter } from '../../async-bloom-filter.js';
import { BloomMath } from '../../bloom-math.js';
import { BloomFilter } from '../../bloom-filter.js';
import { BloomHashScheme } from '../../bloom-hash-scheme.enum.js';
import { InMemoryAsyncBloomFilter } from '../../in-memory-async-bloom-filter.js';
import {
  BLOOM_FORMAT_VERSION,
  type SerializedBloomFilter,
} from '../../serialized-bloom-filter.js';

/** Datos de prueba de bloom: filtros llenos, listas de ítems y formas serializadas. */
export class BloomFixtures {
  /** Filtro con `count` ítems `item-0`, `item-1`... insertados al 1 %. */
  static filledFilter(count: number): BloomFilter {
    const filter = BloomFilter.create({ expectedItems: count });
    for (const item of BloomFixtures.items('item', count)) {
      filter.add(item);
    }
    return filter;
  }

  /** `count` ítems con el prefijo dado: `prefix-0`, `prefix-1`... */
  static items(prefix: string, count: number): string[] {
    const items: string[] = [];
    for (let i = 0; i < count; i += 1) {
      items.push(`${prefix}-${i}`);
    }
    return items;
  }

  /** Cuántos de los ítems dados el filtro dice que puede contener. */
  static async countPositive(
    filter: AsyncBloomFilter,
    items: readonly string[],
  ): Promise<number> {
    let positives = 0;
    for (const item of items) {
      if (await filter.mightContain(item)) {
        positives += 1;
      }
    }
    return positives;
  }

  /** Cuántos de los ítems dados el filtro síncrono dice que puede contener. */
  static countPositiveSync(
    filter: BloomFilter,
    items: readonly string[],
  ): number {
    return items.filter((item) => filter.mightContain(item)).length;
  }

  /** Forma serializada válida, con los campos sobrescritos que se pidan. */
  static validSerialized(
    overrides: Partial<Record<keyof SerializedBloomFilter, unknown>>,
  ): SerializedBloomFilter {
    const base = {
      version: BLOOM_FORMAT_VERSION,
      scheme: BloomHashScheme.EnhancedDoubleHashing,
      bits: 16,
      hashes: 2,
      data: 'AAA=',
      ...overrides,
    };
    return base as SerializedBloomFilter;
  }

  /** Filtros en memoria, uno por partición, para pruebas de partición. */
  static inMemoryPartitions(
    count: number,
    expectedItems: number,
  ): InMemoryAsyncBloomFilter[] {
    const parts: InMemoryAsyncBloomFilter[] = [];
    for (let i = 0; i < count; i += 1) {
      parts.push(
        new InMemoryAsyncBloomFilter(BloomFilter.create({ expectedItems })),
      );
    }
    return parts;
  }

  /** Inserta todos los ítems en el filtro. */
  static addAll(filter: BloomFilter, items: readonly string[]): void {
    for (const item of items) {
      filter.add(item);
    }
  }

  /** Cuántos ítems caen en cada una de las particiones. */
  static partitionCounts(
    items: readonly string[],
    partitions: number,
  ): number[] {
    const counts = Array.from({ length: partitions }, () => 0);
    for (const item of items) {
      counts[BloomMath.partitionOf(item, partitions)] += 1;
    }
    return counts;
  }
}
