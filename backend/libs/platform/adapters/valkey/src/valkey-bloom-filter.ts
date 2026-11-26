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
 * Bloom filter stored by the Valkey bloom module (`valkey-bloom`,
 * `BF.*` commands). The filter is created on the first insert with the declared capacity
 * and rate, so all processes agree on its shape.
 *
 * It needs a server with the module (the `valkey/valkey-bundle` image or
 * ElastiCache for Valkey 8.1 or later; Terraform pins major version 8).
 * The module bounds the memory of each filter (`bf.bloom-memory-usage-limit`, 128 MiB
 * by default): a very large set is split with `PartitionedBloomFilter`.
 */
export class ValkeyBloomFilter implements RebuildableBloomFilter {
  readonly key: string;
  private readonly capacity: number;
  private readonly rate: number;
  private readonly nonScaling: boolean;
  private readonly ids: IdGenerator;

  /**
   * The same validation as the in-memory sizing.
   * @throws InvalidParametersError (`@platform/bloom`) with an invalid name, size or rate.
   */
  constructor(
    private readonly executor: ValkeyCommandExecutor,
    options: ValkeyBloomFilterOptions,
  ) {
    this.key = BloomKeys.filter(options.keyspace, options.name);
    this.capacity = options.expectedItems;
    this.rate =
      options.falsePositiveRate ?? BloomSizing.DEFAULT_FALSE_POSITIVE_RATE;
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
   * Fills a new filter under a temporary key and swaps it in with an
   * atomic rename. If the job dies, the temporary key expires after
   * `BloomKeys.REBUILD_KEY_TTL_MS`.
   * NOCREATE: if the temporary filter expired, it fails instead of building a partial one.
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
