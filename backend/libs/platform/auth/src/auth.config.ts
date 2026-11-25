import { ConfigSection } from '@platform/config';
import { z } from 'zod';

/**
 * Token verification variables. `AUTH_JWKS_URL` is only needed in the
 * services that download the identity keys; identity and the tests pass their
 * own `JwksKeySource` to the module.
 */
export const authConfigSchema = z.object({
  /** Issuer that the `iss` claim must name (the region's `IDENTITY_ISSUER`). */
  AUTH_ISSUER: z.string().trim().min(1),
  /** URL of the identity public JWKS. */
  AUTH_JWKS_URL: z.url().optional(),
});

/** Validated configuration of `@platform/auth`. */
export type AuthSettings = z.infer<typeof authConfigSchema>;

/** Configuration section that `AuthModule` validates at startup. */
export const AuthConfig = new ConfigSection<AuthSettings>(
  'auth',
  authConfigSchema,
);
