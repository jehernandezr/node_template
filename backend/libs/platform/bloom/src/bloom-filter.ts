import { BloomMath } from './bloom-math.js';
import { BloomHashScheme } from './bloom-hash-scheme.enum.js';
import { BloomSizing } from './bloom-sizing.js';
import type {
  BloomFilterOptions,
  CreateBloomFilterOptions,
} from './bloom-filter.options.js';
import {
  BLOOM_FORMAT_VERSION,
  type SerializedBloomFilter,
} from './serialized-bloom-filter.js';
import { BloomGuard } from './errors/bloom-guard.js';
import { CorruptedDataError } from './errors/corrupted-data.error.js';
import { IncompatibleFiltersError } from './errors/incompatible-filters.error.js';

/**
 * Space-efficient probabilistic set. `mightContain` answers "definitely not"
 * or "maybe", with no false negatives.
 */
export class BloomFilter {
  /** Number of bits in the filter. */
  readonly bits: number;
  /** Number of hash positions per item. */
  readonly hashes: number;
  private readonly data: Uint8Array;

  /**
   * @throws InvalidParametersError when `bits` or `hashes` are out of range.
   * @throws CorruptedDataError when `data` has another length or sets leftover bits.
   */
  constructor(options: BloomFilterOptions) {
    this.bits = BloomGuard.instance.integerInRange(
      'bits',
      options.bits,
      BloomSizing.MIN_BITS,
      BloomSizing.MAX_BITS,
    );
    this.hashes = BloomGuard.instance.integerInRange(
      'hashes',
      options.hashes,
      BloomSizing.MIN_HASHES,
      BloomSizing.MAX_HASHES,
    );

    const byteLength = Math.ceil(this.bits / 8);
    if (options.data !== undefined) {
      if (options.data.length !== byteLength) {
        throw new CorruptedDataError(
          `expected ${byteLength} bytes for ${this.bits} bits, got ${options.data.length}`,
        );
      }
      this.data = Uint8Array.from(options.data);
      this.assertUnusedTailBitsClear();
    } else {
      this.data = new Uint8Array(byteLength);
    }
  }

  /** Creates an empty filter sized for `expectedItems` with the given rate. */
  static create(options: CreateBloomFilterOptions): BloomFilter {
    return new BloomFilter(
      BloomSizing.optimalParameters(
        options.expectedItems,
        options.falsePositiveRate ?? BloomSizing.DEFAULT_FALSE_POSITIVE_RATE,
      ),
    );
  }

  /** Inserts an item. */
  add(item: string): void {
    for (const position of this.positions(item)) {
      this.data[Math.floor(position / 8)] |= 1 << (position % 8);
    }
  }

  /** Returns false when the item is definitely absent; true when it might be present. */
  mightContain(item: string): boolean {
    return this.positions(item).every(
      (position) =>
        (this.data[Math.floor(position / 8)] & (1 << (position % 8))) !== 0,
    );
  }

  /** Estimates how many distinct items were inserted, from the set bits. */
  approximateCount(): number {
    const setBits = this.countSetBits();
    if (setBits === this.bits) {
      return Number.POSITIVE_INFINITY;
    }
    return Math.max(
      0,
      Math.round(
        -(this.bits / this.hashes) * Math.log(1 - setBits / this.bits),
      ),
    );
  }

  /** Estimates the current false positive rate from the fill: (set bits / m)^k. */
  estimatedFalsePositiveRate(): number {
    return Math.pow(this.countSetBits() / this.bits, this.hashes);
  }

  /** Encodes the filter with its format version, its hash scheme and the bits in base64. */
  serialize(): SerializedBloomFilter {
    return {
      version: BLOOM_FORMAT_VERSION,
      scheme: BloomHashScheme.EnhancedDoubleHashing,
      bits: this.bits,
      hashes: this.hashes,
      data: Buffer.from(this.data).toString('base64'),
    };
  }

  /**
   * Restores a filter produced by `serialize`.
   * @throws CorruptedDataError when the version or scheme is unknown, the base64 is not canonical,
   *   the length does not match `bits` or leftover bits are set.
   */
  static deserialize(serialized: SerializedBloomFilter): BloomFilter {
    if (serialized.version !== BLOOM_FORMAT_VERSION) {
      throw new CorruptedDataError(
        `unsupported bloom format version: ${String(serialized.version)}`,
      );
    }
    if (serialized.scheme !== BloomHashScheme.EnhancedDoubleHashing) {
      throw new CorruptedDataError(
        `unsupported bloom hash scheme: ${String(serialized.scheme)}`,
      );
    }
    return new BloomFilter({
      bits: serialized.bits,
      hashes: serialized.hashes,
      data: BloomFilter.decodeCanonicalBase64(serialized.data),
    });
  }

  /**
   * Returns a new filter with the items of both. Neither input changes.
   * @throws IncompatibleFiltersError when the two filters have different parameters.
   */
  union(other: BloomFilter): BloomFilter {
    if (other.bits !== this.bits || other.hashes !== this.hashes) {
      throw new IncompatibleFiltersError(
        `cannot union filters with (${this.bits}, ${this.hashes}) and (${other.bits}, ${other.hashes})`,
      );
    }
    const merged = new Uint8Array(this.data.length);
    for (let i = 0; i < merged.length; i++) {
      merged[i] = this.data[i] | other.data[i];
    }
    return new BloomFilter({
      bits: this.bits,
      hashes: this.hashes,
      data: merged,
    });
  }

  private positions(item: string): number[] {
    return BloomMath.positions(item, this.bits, this.hashes);
  }

  private assertUnusedTailBitsClear(): void {
    const remainder = this.bits % 8;
    if (remainder === 0) {
      return;
    }
    const unusedMask = (0xff << remainder) & 0xff;
    if ((this.data[this.data.length - 1] & unusedMask) !== 0) {
      throw new CorruptedDataError('unused tail bits of the last byte are set');
    }
  }

  private countSetBits(): number {
    let count = 0;
    for (const byte of this.data) {
      let value = byte;
      while (value !== 0) {
        count += value & 1;
        value >>>= 1;
      }
    }
    return count;
  }

  /**
   * Decodes base64 and requires it to be canonical (re-encoding yields the same text).
   * @throws CorruptedDataError otherwise.
   */
  private static decodeCanonicalBase64(data: string): Uint8Array {
    if (typeof data !== 'string' || data.length % 4 !== 0) {
      throw new CorruptedDataError('data is not valid base64');
    }
    const bytes = Buffer.from(data, 'base64');
    if (bytes.toString('base64') !== data) {
      throw new CorruptedDataError('data is not canonical base64');
    }
    return new Uint8Array(bytes);
  }
}
