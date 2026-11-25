import { z } from 'zod';
import { IdSchema } from '@contracts/platform';
import { AccessTokenRules } from '../constants/identity.constants.js';
import { PlatformRole } from '../enums/access.enum.js';
import { TokenAudience } from '../enums/auth.enum.js';
import { AuthMethodReferenceSchema } from './auth.schema.js';
import type { AccessTokenClaims } from '../types/auth.type.js';

const EpochSecondsSchema = z.number().int().positive();

export const TokenAudienceSchema = z
  .enum(TokenAudience)
  .describe('Audience of an access token.') satisfies z.ZodType<TokenAudience>;

/**
 * Access token claims. Unknown claims are discarded and not
 * rejected, so a new issuer and an old verifier can coexist during a
 * deployment.
 */
export const AccessTokenClaimsSchema = z
  .object({
    iss: z.string().min(1).max(256),
    aud: TokenAudienceSchema,
    sub: IdSchema,
    tid: IdSchema,
    htid: IdSchema,
    sid: IdSchema,
    did: IdSchema.optional(),
    amr: z.array(AuthMethodReferenceSchema).min(1).max(6),
    auth_time: EpochSecondsSchema,
    roles: z.array(z.string().min(1).max(64)).max(64),
    proles: z.array(z.enum(PlatformRole)).max(16),
    pv: z.string().regex(/^\d{1,15}\.\d{1,15}$/),
    rgn: z.string().min(1).max(32),
    sxp: EpochSecondsSchema,
    iat: EpochSecondsSchema,
    exp: EpochSecondsSchema,
    jti: IdSchema,
  })
  .refine(
    (claims) =>
      claims.exp - claims.iat >= AccessTokenRules.minLifetimeSeconds &&
      claims.exp - claims.iat <= AccessTokenRules.maxLifetimeSeconds,
    { message: 'The token lifetime is outside the allowed range.' },
  )
  .describe(
    'Claims of the JWT access token.',
  ) satisfies z.ZodType<AccessTokenClaims>;
