import type { RandomSource } from '@platform/kernel';

/** Secretos aleatorios de identity: tokens opacos y códigos numéricos, a partir de una `RandomSource`. */
export class SecretGenerator {
  private static readonly DIGITS = '0123456789';
  private static readonly BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  private static readonly ALPHANUMERIC =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  constructor(private readonly random: RandomSource) {}

  bytes(length: number): Buffer {
    return Buffer.from(this.random.bytes(length));
  }

  /** Código numérico de `length` dígitos, uniforme (sin sesgo de módulo). */
  digits(length: number): string {
    return this.fromAlphabet(SecretGenerator.DIGITS, length);
  }

  /** Texto en base32 (RFC 4648, mayúsculas), como el prefijo de una API key. */
  base32(length: number): string {
    return this.fromAlphabet(SecretGenerator.BASE32, length);
  }

  alphanumeric(length: number): string {
    return this.fromAlphabet(SecretGenerator.ALPHANUMERIC, length);
  }

  /** Cada símbolo sale de un byte; se descartan los bytes que darían más peso a los primeros símbolos. */
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
