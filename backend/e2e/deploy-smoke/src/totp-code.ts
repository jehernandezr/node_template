import { createHmac } from 'node:crypto';

/** RFC 6238 TOTP as authenticator apps compute it: HMAC-SHA1 over 30 s steps, 6 digits. */
export class TotpCode {
  private static readonly ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  private static readonly STEP_SECONDS = 30;
  private static readonly DIGITS = 6;

  /**
   * The code of the step that holds an instant.
   * @param base32Secret TOTP secret in Base32, as the smoke account carries it.
   * @param atMs Instant in milliseconds.
   * @param digits Length of the code.
   * @returns The code, left-padded with zeros.
   */
  static at(
    base32Secret: string,
    atMs: number,
    digits = TotpCode.DIGITS,
  ): string {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(
      BigInt(Math.floor(atMs / 1000 / TotpCode.STEP_SECONDS)),
    );
    const hmac = createHmac('sha1', TotpCode.decode(base32Secret))
      .update(counter)
      .digest();
    const offset = (hmac[hmac.length - 1] ?? 0) & 0x0f;
    const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
    return String(binary % 10 ** digits).padStart(digits, '0');
  }

  private static decode(text: string): Buffer {
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];
    for (const char of text.toUpperCase().replace(/=+$/, '')) {
      value = ((value << 5) | TotpCode.ALPHABET.indexOf(char)) & 0xffff;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return Buffer.from(bytes);
  }
}
