const encoder = new TextEncoder();

/**
 * MurmurHash3 (x86, 32-bit) over the UTF-8 bytes of `input`.
 * @param seed optional unsigned 32-bit seed, defaults to 0.
 * @returns an unsigned 32-bit integer.
 */
export function murmur3_32(input: string, seed = 0): number {
  const bytes = encoder.encode(input);
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
