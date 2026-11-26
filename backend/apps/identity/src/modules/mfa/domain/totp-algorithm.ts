import { createHmac } from 'node:crypto';

/**
 * RFC 6238 TOTP over RFC 4226 HOTP: HMAC-SHA1, 30 s steps and 6 digits, like authenticator
 * apps. It is pure, stateless computation.
 */
export class TotpAlgorithm {
  static readonly STEP_SECONDS = 30;
  static readonly DIGITS = 6;
  /** Tolerance steps on each side, for skewed clocks. */
  static readonly WINDOW = 1;

  /**
   * Computes the TOTP step of an instant.
   * @param atMs Instant in milliseconds.
   * @returns The step.
   */
  step(atMs: number): number {
    return Math.floor(atMs / 1000 / TotpAlgorithm.STEP_SECONDS);
  }

  /**
   * HOTP code of the counter.
   * @param secret TOTP secret.
   * @param counter Step or counter.
   * @param digits Length of the code.
   * @returns The code.
   */
  code(secret: Buffer, counter: number, digits = TotpAlgorithm.DIGITS): string {
    const message = Buffer.alloc(8);
    message.writeBigUInt64BE(BigInt(counter));
    const hmac = createHmac('sha1', secret).update(message).digest();
    const offset = (hmac[hmac.length - 1] ?? 0) & 0x0f;
    const binary =
      (((hmac[offset] ?? 0) & 0x7f) << 24) |
      ((hmac[offset + 1] ?? 0) << 16) |
      ((hmac[offset + 2] ?? 0) << 8) |
      (hmac[offset + 3] ?? 0);
    return String(binary % 10 ** digits).padStart(digits, '0');
  }

  /**
   * The step that matches the code within the window, or `undefined`.
   * @param secret TOTP secret.
   * @param code Code to check.
   * @param atMs Instant of the check.
   * @returns The matching step, or `undefined`.
   */
  match(secret: Buffer, code: string, atMs: number): number | undefined {
    const current = this.step(atMs);
    for (
      let delta = -TotpAlgorithm.WINDOW;
      delta <= TotpAlgorithm.WINDOW;
      delta += 1
    ) {
      if (this.code(secret, current + delta, code.length) === code) {
        return current + delta;
      }
    }
    return undefined;
  }
}
