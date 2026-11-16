import { AsyncBloomFilter } from './async-bloom-filter.js';
import { BloomMath } from './bloom-math.js';
import type {
  BloomRebuildSource,
  BloomRebuildSourceFactory,
} from './bloom-rebuild-source.js';
import { BloomSizing } from './bloom-sizing.js';
import { InvalidParametersError } from './errors/invalid-parameters.error.js';
import { RebuildableBloomFilter } from './rebuildable-bloom-filter.js';

/**
 * Un filtro lógico repartido en varios filtros según un hash del ítem. Cada ítem vive en una sola
 * partición, así que la tasa de falsos positivos del conjunto es la de cada partición. Sirve cuando un
 * conjunto no cabe en un solo filtro: la lista de Have I Been Pwned no cabe en un filtro de 2^32 bits al
 * 1 %, y el módulo `BF.*` de Valkey limita la memoria de cada filtro (`bf.bloom-memory-usage-limit`, 128 MiB
 * por defecto).
 *
 * Dimensiona cada partición para `expectedItems / partitions` ítems. Reconstruye cada partición por separado,
 * dándole solo los ítems para los que `BloomMath.partitionOf` devuelve su índice.
 */
export class PartitionedBloomFilter extends AsyncBloomFilter {
  private readonly partitions: readonly AsyncBloomFilter[];

  /** @throws InvalidParametersError sin particiones o con más de `BloomSizing.MAX_PARTITIONS`. */
  constructor(partitions: readonly AsyncBloomFilter[]) {
    super();
    if (
      partitions.length === 0 ||
      partitions.length > BloomSizing.MAX_PARTITIONS
    ) {
      throw new InvalidParametersError(
        `partitions must have between 1 and ${BloomSizing.MAX_PARTITIONS} filters, got ${partitions.length}`,
      );
    }
    this.partitions = [...partitions];
  }

  /** Número de particiones. */
  get size(): number {
    return this.partitions.length;
  }

  add(item: string): Promise<void> {
    return this.partitionFor(item).add(item);
  }

  async addMany(items: readonly string[]): Promise<void> {
    const batches = new Map<number, string[]>();
    for (const item of items) {
      const index = BloomMath.partitionOf(item, this.partitions.length);
      const batch = batches.get(index);
      if (batch === undefined) {
        batches.set(index, [item]);
      } else {
        batch.push(item);
      }
    }
    await Promise.all(
      [...batches].map(([index, batch]) =>
        this.partitions[index].addMany(batch),
      ),
    );
  }

  mightContain(item: string): Promise<boolean> {
    return this.partitionFor(item).mightContain(item);
  }

  /**
   * Reconstruye cada partición desde una fuente nueva. Antes comprueba que todas se puedan reconstruir y, si
   * no, lanza `InvalidParametersError` sin tocar ninguna. Luego, en secuencia, cada partición lee la fuente
   * desde el principio y se queda solo con sus ítems, así no se guarda todo el conjunto en memoria.
   */
  async rebuildFrom(factory: BloomRebuildSourceFactory): Promise<void> {
    const rebuildable = this.partitions.filter(RebuildableBloomFilter.is);
    if (rebuildable.length !== this.partitions.length) {
      throw new InvalidParametersError(
        'every partition must be rebuildable to rebuild the filter',
      );
    }
    for (let index = 0; index < rebuildable.length; index += 1) {
      await rebuildable[index].rebuild(this.itemsOf(factory, index));
    }
  }

  private partitionFor(item: string): AsyncBloomFilter {
    return this.partitions[BloomMath.partitionOf(item, this.partitions.length)];
  }

  /** Lotes de la fuente que pertenecen a la partición `index`. Los lotes vacíos no se entregan. */
  private async *itemsOf(
    factory: BloomRebuildSourceFactory,
    index: number,
  ): AsyncGenerator<readonly string[]> {
    const source: BloomRebuildSource = factory();
    for await (const batch of source) {
      const own = batch.filter(
        (item) => BloomMath.partitionOf(item, this.partitions.length) === index,
      );
      if (own.length > 0) {
        yield own;
      }
    }
  }
}
