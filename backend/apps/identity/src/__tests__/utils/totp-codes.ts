import { TotpAlgorithm } from '../../modules/mfa/domain/totp-algorithm.js';

/** The test authenticator app: computes the current TOTP code from the base32 secret. */
export class TotpCodes {
  private static readonly ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  private readonly algorithm = new TotpAlgorithm();

  current(base32Secret: string, atMs = Date.now()): string {
    return this.algorithm.code(
      TotpCodes.decode(base32Secret),
      this.algorithm.step(atMs),
    );
  }

  /** The code of the next step: one different from the current one that is still within the window. */
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
