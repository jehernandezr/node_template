import { createHmac } from 'node:crypto';

/**
 * TOTP de RFC 6238 sobre HOTP de RFC 4226: HMAC-SHA1, pasos de 30 s y 6 dígitos, como las apps de
 * autenticación. Es cálculo puro, sin estado.
 */
export class TotpAlgorithm {
  static readonly STEP_SECONDS = 30;
  static readonly DIGITS = 6;
  /** Pasos de tolerancia hacia cada lado, por relojes desfasados. */
  static readonly WINDOW = 1;

  step(atMs: number): number {
    return Math.floor(atMs / 1000 / TotpAlgorithm.STEP_SECONDS);
  }

  /** Código HOTP del contador. */
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

  /** El paso que coincide con el código dentro de la ventana, o `undefined`. */
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
