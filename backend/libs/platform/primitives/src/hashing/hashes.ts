/** Fast hashes that are stable across processes. */
export class Hashes {
  private static readonly FNV_OFFSET_BASIS_32 = 0x811c9dc5;
  private static readonly FNV_PRIME_32 = 0x01000193;
  private static readonly encoder = new TextEncoder();

  /**
   * 32-bit FNV-1a over the UTF-8 bytes of `input` (or over the given bytes).
   * Not cryptographic: not suitable for idempotency keys or anything that
   * an attacker can force to collide.
   * @returns Unsigned integer in `[0, 2^32)`.
   */
  static fnv1a32(input: string | Uint8Array): number {
    const bytes =
      typeof input === 'string' ? Hashes.encoder.encode(input) : input;
    let hash = Hashes.FNV_OFFSET_BASIS_32;
    for (const byte of bytes) {
      hash ^= byte;
      hash = Math.imul(hash, Hashes.FNV_PRIME_32);
    }
    return hash >>> 0;
  }

  /** Returns 32-bit FNV-1a as 8 lowercase hexadecimal characters. */
  static fnv1a32Hex(input: string | Uint8Array): string {
    return Hashes.fnv1a32(input).toString(16).padStart(8, '0');
  }
}
