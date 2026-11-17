import { TotpAlgorithm } from '../../modules/mfa/domain/totp-algorithm.js';

/** La app de autenticación de la prueba: calcula el código TOTP actual a partir del secreto en base32. */
export class TotpCodes {
  private static readonly ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  private readonly algorithm = new TotpAlgorithm();

  current(base32Secret: string, atMs = Date.now()): string {
    return this.algorithm.code(
      TotpCodes.decode(base32Secret),
      this.algorithm.step(atMs),
    );
  }

  /** El código del paso siguiente: uno distinto del actual que sigue dentro de la ventana. */
  next(base32Secret: string, atMs = Date.now()): string {
    return this.algorithm.code(
      TotpCodes.decode(base32Secret),
      this.algorithm.step(atMs) + 1,
    );
  }

  private static decode(text: string): Buffer {
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];
    for (const char of text) {
      value = (value << 5) | TotpCodes.ALPHABET.indexOf(char);
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return Buffer.from(bytes);
  }
}
