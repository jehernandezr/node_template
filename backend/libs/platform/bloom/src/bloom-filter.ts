import { CorruptedData, IncompatibleFilters } from './bloom-error.js';
import { bloomPositions } from './positions.js';
import {
  DEFAULT_FALSE_POSITIVE_RATE,
  optimalParameters,
  type BloomParameters,
} from './optimal-parameters.js';
import {
  MAX_BITS,
  MAX_HASHES,
  MIN_BITS,
  MIN_HASHES,
  assertIntegerInRange,
} from './limits.js';

/** Identifies how items map to bit positions. Part of the serialized format. */
export enum BloomHashScheme {
  EnhancedDoubleHashing = 'fnv1a32+murmur3_32/edh',
}

/** Serialized format version understood by this library. */
export const BLOOM_FORMAT_VERSION = 1 as const;

/** Options accepted by the {@link BloomFilter} constructor. */
export interface BloomFilterOptions extends BloomParameters {
  /** Raw bit array. Must be exactly `ceil(bits / 8)` bytes with unused tail bits zero. Copied on construction. */
  readonly data?: Uint8Array;
}

/** Options accepted by {@link BloomFilter.create}. */
export interface CreateBloomFilterOptions {
  readonly expectedItems: number;
  /** Default {@link DEFAULT_FALSE_POSITIVE_RATE} (1 %). */
  readonly falsePositiveRate?: number;
}

/** JSON-friendly representation of a filter. `data` is canonical base64 of the bit array. */
export interface SerializedBloomFilter extends BloomParameters {
  readonly version: typeof BLOOM_FORMAT_VERSION;
  readonly scheme: BloomHashScheme;
  readonly data: string;
}

/**
 * Space-efficient probabilistic set. `mightContain` answers "definitely not" or
 * "maybe", with no false negatives.
 */
export class BloomFilter {
  /** Number of bits in the filter. */
  readonly bits: number;
  /** Number of hash positions per item. */
  readonly hashes: number;
  private readonly data: Uint8Array;

  /**
   * @throws {InvalidParameters} when `bits` or `hashes` is outside its supported range.
   * @throws {CorruptedData} when `data` has the wrong length or sets unused tail bits.
   */
  constructor(options: BloomFilterOptions) {
    assertIntegerInRange(options.bits, MIN_BITS, MAX_BITS, 'bits');
    assertIntegerInRange(options.hashes, MIN_HASHES, MAX_HASHES, 'hashes');
    this.bits = options.bits;
    this.hashes = options.hashes;

    const byteLength = Math.ceil(this.bits / 8);
    if (options.data !== undefined) {
      if (options.data.length !== byteLength) {
        throw new CorruptedData(
          `expected ${byteLength} bytes for ${this.bits} bits, got ${options.data.length}`,
        );
      }
      this.data = Uint8Array.from(options.data);
      this.assertUnusedTailBitsClear();
    } else {
      this.data = new Uint8Array(byteLength);
    }
  }

  /** Builds an empty filter sized for `expectedItems` at `falsePositiveRate`. */
  static create(options: CreateBloomFilterOptions): BloomFilter {
    return new BloomFilter(
      optimalParameters(
        options.expectedItems,
        options.falsePositiveRate ?? DEFAULT_FALSE_POSITIVE_RATE,
      ),
    );
  }

  /** Inserts an item. */
  add(item: string): void {
    for (const position of this.positions(item)) {
      this.data[Math.floor(position / 8)] |= 1 << (position % 8);
    }
  }

  /** Returns false when the item is definitely absent, true when it may be present. */
  mightContain(item: string): boolean {
    return this.positions(item).every(
      (position) =>
        (this.data[Math.floor(position / 8)] & (1 << (position % 8))) !== 0,
    );
  }

  /** Estimates the number of distinct inserted items from the count of set bits. */
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

  /** Estimates the current false positive rate from the fill ratio: (set bits / m)^k. */
  estimatedFalsePositiveRate(): number {
    return Math.pow(this.countSetBits() / this.bits, this.hashes);
  }

  /** Encodes the filter with its format version, hash scheme and base64 bit data. */
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
   * Restores a filter produced by {@link BloomFilter.serialize}.
   * @throws {CorruptedData} when the version or scheme is unknown, the base64 is not canonical,
   *   the length does not match `bits`, or unused tail bits are set.
   */
  static deserialize(serialized: SerializedBloomFilter): BloomFilter {
    if (serialized.version !== BLOOM_FORMAT_VERSION) {
      throw new CorruptedData(
        `unsupported bloom format version: ${String(serialized.version)}`,
      );
    }
    if (serialized.scheme !== BloomHashScheme.EnhancedDoubleHashing) {
      throw new CorruptedData(
        `unsupported bloom hash scheme: ${String(serialized.scheme)}`,
      );
    }
    return new BloomFilter({
      bits: serialized.bits,
      hashes: serialized.hashes,
      data: decodeCanonicalBase64(serialized.data),
    });
  }

  /**
   * Returns a new filter containing the items of both filters. Neither input is modified.
   * @throws {IncompatibleFilters} when the two filters have different parameters.
   */
  union(other: BloomFilter): BloomFilter {
    if (other.bits !== this.bits || other.hashes !== this.hashes) {
      throw new IncompatibleFilters(
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
    return bloomPositions(item, this.bits, this.hashes);
  }

  private assertUnusedTailBitsClear(): void {
    const remainder = this.bits % 8;
    if (remainder === 0) {
      return;
    }
    const unusedMask = (0xff << remainder) & 0xff;
    if ((this.data[this.data.length - 1] & unusedMask) !== 0) {
      throw new CorruptedData('unused tail bits of the last byte are set');
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
}

/**
 * Decodes base64 and requires it to be canonical (re-encoding yields the same string).
 * @throws {CorruptedData} otherwise.
 */
function decodeCanonicalBase64(data: string): Uint8Array {
  if (typeof data !== 'string' || data.length % 4 !== 0) {
    throw new CorruptedData('data is not valid base64');
  }
  const bytes = Buffer.from(data, 'base64');
  if (bytes.toString('base64') !== data) {
    throw new CorruptedData('data is not canonical base64');
  }
  return new Uint8Array(bytes);
}
