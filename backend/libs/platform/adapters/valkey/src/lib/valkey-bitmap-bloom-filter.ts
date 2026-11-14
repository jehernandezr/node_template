import {
  bloomPositions,
  BloomFilter,
  DEFAULT_FALSE_POSITIVE_RATE,
  IncompatibleFilters,
  optimalParameters,
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
  runCommand,
  ValkeyCommand,
  type ValkeyArgument,
  type ValkeyCommandRunner,
} from './valkey-client.js';
import { ValkeyUnexpectedReplyError } from './valkey-error.js';

/** Options of {@link ValkeyBitmapBloomFilter}. */
export interface ValkeyBitmapBloomFilterOptions {
  /** Filter name, usually a value of the caller's filter enum. */
  readonly name: string;
  readonly expectedItems: number;
  /** Default {@link DEFAULT_FALSE_POSITIVE_RATE} (1 %). */
  readonly falsePositiveRate?: number;
  /** Default {@link DEFAULT_BLOOM_KEY_PREFIX}. */
  readonly keyPrefix?: string;
  /** Names the temporary keys of a rebuild. Default UUIDv7. */
  readonly ids?: IdGenerator;
}

/**
 * Bit offset in Valkey of a filter bit. `BloomFilter` sets bit `p` as `1 << (p % 8)` of byte `p / 8` (least
 * significant first); Valkey numbers bits from the most significant one. With this mapping the Valkey
 * string has exactly the bytes of `BloomFilter.serialize()`, so a filter built in memory can be loaded.
 */
export function valkeyBitOffset(position: number): number {
  const bit = position % 8;
  return position - bit + (7 - bit);
}

/**
 * Bloom filter as a plain Valkey bitmap, for servers without the bloom module. Same hashing and layout as
 * the in-memory `BloomFilter` (enhanced double hashing, `BloomHashScheme.EnhancedDoubleHashing`). Each insert
 * is one `BITFIELD` and each check one `BITFIELD_RO`, both atomic. At most 2^32 bits (512 MiB, the largest
 * Valkey string): split bigger sets with `PartitionedBloomFilter`.
 */
export class ValkeyBitmapBloomFilter implements RebuildableBloomFilter {
  readonly key: string;
  readonly bits: number;
  readonly hashes: number;
  private readonly ids: IdGenerator;

  /** @throws InvalidParameters (`@platform/bloom`) for a bad name, size or rate, or one above 2^32 bits. */
  constructor(
    private readonly client: ValkeyCommandRunner,
    options: ValkeyBitmapBloomFilterOptions,
  ) {
    this.key = bloomKey(
      options.keyPrefix ?? DEFAULT_BLOOM_KEY_PREFIX,
      options.name,
    );
    const { bits, hashes } = optimalParameters(
      options.expectedItems,
      options.falsePositiveRate ?? DEFAULT_FALSE_POSITIVE_RATE,
    );
    this.bits = bits;
    this.hashes = hashes;
    this.ids = options.ids ?? new UuidV7IdGenerator();
  }

  add(item: string): Promise<void> {
    return this.write(this.key, [item]);
  }

  async addMany(items: readonly string[]): Promise<void> {
    for (const batch of batches(items)) {
      await this.write(this.key, batch);
    }
  }

  async mightContain(item: string): Promise<boolean> {
    const args: ValkeyArgument[] = [this.key];
    for (const position of bloomPositions(item, this.bits, this.hashes)) {
      args.push('GET', 'u1', valkeyBitOffset(position));
    }
    const reply = await runCommand(
      this.client,
      ValkeyCommand.BitfieldReadOnly,
      args,
    );
    if (!Array.isArray(reply) || reply.length !== this.hashes) {
      throw new ValkeyUnexpectedReplyError(
        ValkeyCommand.BitfieldReadOnly,
        'one integer per hash',
      );
    }
    return reply.every((bit) => bit === 1);
  }

  /**
   * Replaces the filter with a copy of an in-memory `BloomFilter` of the same size, for example one built
   * offline from a large list.
   * @throws IncompatibleFilters (`@platform/bloom`) when sizes differ.
   */
  async load(filter: BloomFilter): Promise<void> {
    if (filter.bits !== this.bits || filter.hashes !== this.hashes) {
      throw new IncompatibleFilters(
        `cannot load a (${filter.bits}, ${filter.hashes}) filter into (${this.bits}, ${this.hashes})`,
      );
    }
    const bytes = Buffer.from(filter.serialize().data, 'base64');
    await runCommand(this.client, ValkeyCommand.Set, [this.key, bytes]);
  }

  /**
   * Fills the bitmap under a temporary key and swaps it in with one atomic rename. If the job dies, the
   * temporary key expires after {@link REBUILD_KEY_TTL_MS}.
   */
  async rebuild(source: BloomRebuildSource): Promise<void> {
    const temporary = rebuildKey(this.key, this.ids);
    try {
      for await (const chunk of source) {
        for (const batch of batches(chunk)) {
          await this.write(temporary, batch);
          await runCommand(this.client, ValkeyCommand.Pexpire, [
            temporary,
            REBUILD_KEY_TTL_MS,
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

  private async write(key: string, items: readonly string[]): Promise<void> {
    if (items.length === 0) {
      return;
    }
    const args: ValkeyArgument[] = [key];
    for (const item of items) {
      for (const position of bloomPositions(item, this.bits, this.hashes)) {
        args.push('SET', 'u1', valkeyBitOffset(position), 1);
      }
    }
    await runCommand(this.client, ValkeyCommand.Bitfield, args);
  }
}
