import {
  DEFAULT_FALSE_POSITIVE_RATE,
  requiredBits,
  type BloomRebuildSource,
  type RebuildableBloomFilter,
} from '@platform/bloom';
import { UuidV7IdGenerator, type IdGenerator } from '@platform/kernel';
import {
  batches,
  bloomKey,
  DEFAULT_BLOOM_KEY_PREFIX,
  REBUILD_KEY_TTL_MS,
  rebuildKey,
  SWAP_REBUILT,
} from './bloom-keys.js';
import {
  integerReply,
  runCommand,
  ValkeyCommand,
  type ValkeyArgument,
  type ValkeyCommandRunner,
} from './valkey-client.js';

/** Options of {@link ValkeyBloomFilter}. */
export interface ValkeyBloomFilterOptions {
  /** Filter name, usually a value of the caller's filter enum. */
  readonly name: string;
  readonly expectedItems: number;
  /** Default {@link DEFAULT_FALSE_POSITIVE_RATE} (1 %). */
  readonly falsePositiveRate?: number;
  /**
   * When false (default), the module adds sub-filters as the filter grows past `expectedItems`, keeping the
   * rate. When true, the filter refuses to grow past its capacity.
   */
  readonly nonScaling?: boolean;
  /** Default {@link DEFAULT_BLOOM_KEY_PREFIX}. */
  readonly keyPrefix?: string;
  /** Names the temporary keys of a rebuild. Default UUIDv7. */
  readonly ids?: IdGenerator;
}

/**
 * Bloom filter held by the Valkey bloom module (`valkey-bloom`, commands `BF.*`). The filter is created on
 * the first insert with the declared capacity and rate, so every process agrees on its shape.
 *
 * Needs a server with the module (the `valkey/valkey-bundle` image, or ElastiCache for Valkey 8.1 or
 * later). Without it, use {@link ValkeyBitmapBloomFilter}. The module caps each filter's memory
 * (`bf.bloom-memory-usage-limit`, 128 MiB by default): split very large sets with `PartitionedBloomFilter`.
 */
export class ValkeyBloomFilter implements RebuildableBloomFilter {
  readonly key: string;
  private readonly capacity: number;
  private readonly rate: number;
  private readonly nonScaling: boolean;
  private readonly ids: IdGenerator;

  /** @throws InvalidParameters (`@platform/bloom`) for a bad name, size or rate. */
  constructor(
    private readonly client: ValkeyCommandRunner,
    options: ValkeyBloomFilterOptions,
  ) {
    this.key = bloomKey(
      options.keyPrefix ?? DEFAULT_BLOOM_KEY_PREFIX,
      options.name,
    );
    this.capacity = options.expectedItems;
    this.rate = options.falsePositiveRate ?? DEFAULT_FALSE_POSITIVE_RATE;
    // Same validation as the in-memory sizing.
    requiredBits(this.capacity, this.rate);
    this.nonScaling = options.nonScaling ?? false;
    this.ids = options.ids ?? new UuidV7IdGenerator();
  }

  add(item: string): Promise<void> {
    return this.addMany([item]);
  }

  async addMany(items: readonly string[]): Promise<void> {
    for (const batch of batches(items)) {
      await runCommand(this.client, ValkeyCommand.BloomInsert, [
        this.key,
        ...this.shape(),
        'ITEMS',
        ...batch,
      ]);
    }
  }

  async mightContain(item: string): Promise<boolean> {
    const reply = await runCommand(this.client, ValkeyCommand.BloomExists, [
      this.key,
      item,
    ]);
    return integerReply(ValkeyCommand.BloomExists, reply) === 1;
  }

  /**
   * Fills a fresh filter under a temporary key and swaps it in with one atomic rename. If the job dies, the
   * temporary key expires after {@link REBUILD_KEY_TTL_MS}.
   */
  async rebuild(source: BloomRebuildSource): Promise<void> {
    const temporary = rebuildKey(this.key, this.ids);
    const reserve: ValkeyArgument[] = [temporary, this.rate, this.capacity];
    if (this.nonScaling) {
      reserve.push('NONSCALING');
    }
    try {
      await runCommand(this.client, ValkeyCommand.BloomReserve, reserve);
      await runCommand(this.client, ValkeyCommand.Pexpire, [
        temporary,
        REBUILD_KEY_TTL_MS,
      ]);
      for await (const chunk of source) {
        for (const batch of batches(chunk)) {
          // NOCREATE: if the temporary filter expired, fail instead of building a partial one.
          await runCommand(this.client, ValkeyCommand.BloomInsert, [
            temporary,
            'NOCREATE',
            'ITEMS',
            ...batch,
          ]);
        }
      }
      await SWAP_REBUILT.run(this.client, [temporary, this.key], []);
    } catch (error) {
      await runCommand(this.client, ValkeyCommand.Del, [temporary]).catch(
        () => undefined,
      );
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
