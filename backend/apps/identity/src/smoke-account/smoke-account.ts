import { z } from 'zod';
import { decodeBase32 } from '../shared/utils/base32.js';

/**
 * The credential of the smoke account: the owner of the smoke tenant that the deploy smoke tests sign in with. A
 * deployment writes fresh values before each seed, so the account is reset to them every time.
 */
export class SmokeAccount {
  private static readonly SCHEMA = z.strictObject({
    email: z.email(),
    password: z.string().min(12).max(128),
    totpSecret: z
      .string()
      .regex(/^[A-Z2-7]{16,}$/)
      .transform((text) => decodeBase32(text)),
  });

  private constructor(
    readonly email: string,
    readonly password: string,
    readonly totpSecret: Uint8Array,
  ) {}

  /**
   * Reads the account from its JSON form, `{ "email", "password", "totpSecret" }`, with the TOTP secret in Base32.
   * @param text JSON text of the account.
   * @returns The account.
   * @throws Error naming the invalid fields, never their values.
   */
  static parse(text: string): SmokeAccount {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error('The smoke account is not JSON');
    }
    const parsed = SmokeAccount.SCHEMA.safeParse(json);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => issue.path.join('.'));
      throw new Error(
        `The smoke account has invalid fields: ${fields.join(', ')}`,
      );
    }
    return new SmokeAccount(
      parsed.data.email,
      parsed.data.password,
      parsed.data.totpSecret,
    );
  }
}
