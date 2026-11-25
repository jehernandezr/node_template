import type { RandomSource } from '@platform/kernel';

/** Identity's random secrets: opaque tokens and numeric codes, from a `RandomSource`. */
export class SecretGenerator {
  private static readonly DIGITS = '0123456789';
  private static readonly BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  private static readonly ALPHANUMERIC =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  constructor(private readonly random: RandomSource) {}

  bytes(length: number): Buffer {
    return Buffer.from(this.random.bytes(length));
  }

  /** Numeric code of `length` digits, uniform (without modulo bias). */
  digits(length: number): string {
    return this.fromAlphabet(SecretGenerator.DIGITS, length);
  }

  /** Base32 text (RFC 4648, uppercase), like an API key prefix. */
  base32(length: number): string {
    return this.fromAlphabet(SecretGenerator.BASE32, length);
  }

  alphanumeric(length: number): string {
    return this.fromAlphabet(SecretGenerator.ALPHANUMERIC, length);
  }

  /** Each symbol comes from one byte; bytes that would give more weight to the first symbols are discarded. */
  private fromAlphabet(alphabet: string, length: number): string {
    const limit = 256 - (256 % alphabet.length);
    let result = '';
    while (result.length < length) {
      for (const byte of this.random.bytes(length * 2)) {
        if (byte < limit && result.length < length) {
          result += alphabet[byte % alphabet.length];
        }
      }
    }
    return result;
  }
}
