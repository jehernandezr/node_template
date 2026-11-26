import { z } from 'zod';

/** The smoke account the suite signs in with: the owner of the smoke tenant. */
export interface SmokeAccount {
  readonly email: string;
  readonly password: string;
  /** TOTP secret in Base32. */
  readonly totpSecret: string;
}

/**
 * What the suite runs against: the public base URL of the environment (`SMOKE_BASE_URL`) and the smoke account
 * (`SMOKE_ACCOUNT`, the JSON the deploy writes to the secret of the same name).
 */
export class SmokeSettings {
  private static readonly ACCOUNT = z.strictObject({
    email: z.email(),
    password: z.string().min(1),
    totpSecret: z.string().regex(/^[A-Z2-7]+=*$/i),
  });
  private static readonly BASE_URL = z.url({ protocol: /^https?$/ });

  private constructor(
    readonly baseUrl: URL,
    readonly account: SmokeAccount,
  ) {}

  /**
   * Reads the settings from the environment.
   * @param env Environment variables.
   * @returns The settings.
   * @throws Error naming the missing or invalid variable, never its value.
   */
  static from(env: NodeJS.ProcessEnv): SmokeSettings {
    const baseUrl = SmokeSettings.BASE_URL.safeParse(env['SMOKE_BASE_URL']);
    if (!baseUrl.success) {
      throw new Error('SMOKE_BASE_URL must be the http(s) URL of the API');
    }
    let json: unknown;
    try {
      json = JSON.parse(env['SMOKE_ACCOUNT'] ?? '');
    } catch {
      throw new Error('SMOKE_ACCOUNT must be JSON');
    }
    const account = SmokeSettings.ACCOUNT.safeParse(json);
    if (!account.success) {
      const fields = account.error.issues.map((issue) => issue.path.join('.'));
      throw new Error(`SMOKE_ACCOUNT has invalid fields: ${fields.join(', ')}`);
    }
    return new SmokeSettings(new URL(baseUrl.data), account.data);
  }
}
