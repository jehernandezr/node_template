import { Hashes } from '@platform/primitives';

/** Hash and position functions of the filter. Changing them changes the serialized format. */
export class BloomMath {
  /** Seed of the hash that picks the partition. It differs from those that pick bit positions. */
  static readonly PARTITION_HASH_SEED = 0x5bd1e995;

  private static readonly ENCODER = new TextEncoder();

  /**
   * MurmurHash3 (x86, 32 bits) over the UTF-8 bytes of `input`.
   * @param seed optional unsigned 32-bit seed; defaults to 0.
   * @returns an unsigned 32-bit integer.
   */
  static murmur3(input: string, seed = 0): number {
    const bytes = BloomMath.ENCODER.encode(input);
    const length = bytes.length;
    const c1 = 0xcc9e2d51;
    const c2 = 0x1b873593;
    let hash = seed >>> 0;

    const blocks = Math.floor(length / 4);
    for (let i = 0; i < blocks; i++) {
      const offset = i * 4;
      let k =
        bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24);
      k = Math.imul(k, c1);
      k = (k << 15) | (k >>> 17);
      k = Math.imul(k, c2);
      hash ^= k;
      hash = (hash << 13) | (hash >>> 19);
      hash = (Math.imul(hash, 5) + 0xe6546b64) | 0;
    }

    const tail = blocks * 4;
    const remaining = length & 3;
    let k1 = 0;
    if (remaining >= 3) {
      k1 ^= bytes[tail + 2] << 16;
    }
    if (remaining >= 2) {
      k1 ^= bytes[tail + 1] << 8;
    }
    if (remaining >= 1) {
      k1 ^= bytes[tail];
      k1 = Math.imul(k1, c1);
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = Math.imul(k1, c2);
      hash ^= k1;
    }

    hash ^= length;
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x85ebca6b);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35);
    hash ^= hash >>> 16;
    return hash >>> 0;
  }

  /**
   * Returns the positions of an item with enhanced double hashing:
   * a = h1 mod m, b = h2 mod m, then for i in 0..k-1: pos = a; a = (a + b) mod m; b = (b + i) mod m.
   * h1 is 32-bit FNV-1a and h2 is 32-bit MurmurHash3 (seed 0) over the UTF-8 bytes.
   * @returns `hashes` positions, each in `[0, bits)`.
   */
  static positions(item: string, bits: number, hashes: number): number[] {
    let a = Hashes.fnv1a32(item) % bits;
    let b = BloomMath.murmur3(item) % bits;
    const positions: number[] = [];
    for (let i = 0; i < hashes; i++) {
      positions.push(a);
      a = (a + b) % bits;
      b = (b + i) % bits;
    }
    return positions;
  }

  /** Returns the partition of an item among `partitions`: MurmurHash3 with `PARTITION_HASH_SEED`, modulo the number of partitions. */
  static partitionOf(item: string, partitions: number): number {
    return BloomMath.murmur3(item, BloomMath.PARTITION_HASH_SEED) % partitions;
  }
}
