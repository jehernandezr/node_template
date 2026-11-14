import { fnv1a32 } from '@platform/primitives';
import { murmur3_32 } from './hashing.js';

/**
 * Bit positions for an item using enhanced double hashing:
 * a = h1 mod m, b = h2 mod m, then for i in 0..k-1: pos = a; a = (a + b) mod m; b = (b + i) mod m.
 * h1 is FNV-1a 32 and h2 is MurmurHash3 32 (seed 0) over the UTF-8 bytes of `item`.
 * Changing this function changes the serialized format; see `BloomHashScheme`.
 * @returns `hashes` positions, each in `[0, bits)`.
 */
export function bloomPositions(
  item: string,
  bits: number,
  hashes: number,
): number[] {
  let a = fnv1a32(item) % bits;
  let b = murmur3_32(item) % bits;
  const positions: number[] = [];
  for (let i = 0; i < hashes; i++) {
    positions.push(a);
    a = (a + b) % bits;
    b = (b + i) % bits;
  }
  return positions;
}
