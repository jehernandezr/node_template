import {
  BloomSizing,
  type BloomRebuildSource,
  type RebuildableBloomFilter,
} from '@platform/bloom';
import type { IdGenerator } from '@platform/kernel';
import { BloomKeys } from './bloom-keys.js';
import type { ValkeyArgument } from './valkey-argument.js';
import { ValkeyCommand } from './valkey-command.enum.js';
import type { ValkeyCommandExecutor } from './valkey-command-executor.js';
import type { ValkeyBloomFilterOptions } from './valkey-bloom-filter.options.js';

/**
 * Filtro de Bloom que guarda el módulo de bloom de Valkey (`valkey-bloom`,
 * comandos `BF.*`). El filtro se crea en la primera inserción con la capacidad
 * y la tasa declaradas, así todos los procesos coinciden en su forma.
 *
 * Necesita un servidor con el módulo (la imagen `valkey/valkey-bundle` o
 * ElastiCache para Valkey 8.1 o posterior; Terraform fija la versión mayor 8).
 * El módulo acota la memoria de cada filtro (`bf.bloom-memory-usage-limit`, 128 MiB
 * por defecto): un conjunto muy grande se reparte con `PartitionedBloomFilter`.
 */
export class ValkeyBloomFilter implements RebuildableBloomFilter {
  readonly key: string;
  private readonly capacity: number;
  private readonly rate: number;
  private readonly nonScaling: boolean;
  private readonly ids: IdGenerator;

  /** @throws InvalidParametersError (`@platform/bloom`) con un nombre, un tamaño o una tasa inválidos. */
  constructor(
    private readonly executor: ValkeyCommandExecutor,
    options: ValkeyBloomFilterOptions,
  ) {
    this.key = BloomKeys.filter(options.keyspace, options.name);
    this.capacity = options.expectedItems;
    this.rate =
      options.falsePositiveRate ?? BloomSizing.DEFAULT_FALSE_POSITIVE_RATE;
    // La misma validación que el dimensionado en memoria.
    BloomSizing.requiredBits(this.capacity, this.rate);
    this.nonScaling = options.nonScaling ?? false;
    this.ids = options.ids;
  }

  add(item: string): Promise<void> {
    return this.addMany([item]);
  }

  async addMany(items: readonly string[]): Promise<void> {
    for (const batch of BloomKeys.batches(items)) {
      await this.executor.run(ValkeyCommand.BloomInsert, [
        this.key,
        ...this.shape(),
        'ITEMS',
        ...batch,
      ]);
    }
  }

  async mightContain(item: string): Promise<boolean> {
    const reply = await this.executor.run(ValkeyCommand.BloomExists, [
      this.key,
      item,
    ]);
    return this.executor.integer(ValkeyCommand.BloomExists, reply) === 1;
  }

  /**
   * Llena un filtro nuevo bajo una llave temporal y lo intercambia con un
   * renombrado atómico. Si el job muere, la llave temporal vence a las
   * `BloomKeys.REBUILD_KEY_TTL_MS`.
   */
  async rebuild(source: BloomRebuildSource): Promise<void> {
    const temporary = BloomKeys.rebuild(this.key, this.ids);
    const reserve: ValkeyArgument[] = [temporary, this.rate, this.capacity];
    if (this.nonScaling) {
      reserve.push('NONSCALING');
    }
    try {
      await this.executor.run(ValkeyCommand.BloomReserve, reserve);
      await this.executor.run(ValkeyCommand.Pexpire, [
        temporary,
        BloomKeys.REBUILD_KEY_TTL_MS,
      ]);
      for await (const chunk of source) {
        for (const batch of BloomKeys.batches(chunk)) {
          // NOCREATE: si el filtro temporal venció, falla en vez de armar uno parcial.
          await this.executor.run(ValkeyCommand.BloomInsert, [
            temporary,
            'NOCREATE',
            'ITEMS',
            ...batch,
          ]);
        }
      }
      await this.executor.script(
        BloomKeys.SWAP_REBUILT,
        [temporary, this.key],
        [],
      );
    } catch (error) {
      await this.executor
        .run(ValkeyCommand.Del, [temporary])
        .catch(() => undefined);
      throw error;
    }
  }

  private shape(): ValkeyArgument[] {
    const shape: ValkeyArgument[] = [
      'CAPACITY',
      this.capacity,
      'ERROR',
      this.rate,
    ];
    if (this.nonScaling) {
      shape.push('NONSCALING');
    }
    return shape;
  }
}
