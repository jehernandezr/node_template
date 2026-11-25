import { z } from 'zod';
import { IdentityLimits } from '../constants/identity.constants.js';
import type { Jwk, Jwks } from '../types/jwks.type.js';

const JwkFieldSchema = z.string().min(1).max(IdentityLimits.jwkFieldMaxLength);

export const JwkSchema = z
  .object({
    kty: JwkFieldSchema,
    crv: JwkFieldSchema,
    kid: JwkFieldSchema,
    use: JwkFieldSchema,
    alg: JwkFieldSchema,
    x: JwkFieldSchema,
    y: JwkFieldSchema,
  })
  .describe('Public key of the JWKS set.') satisfies z.ZodType<Jwk>;

export const JwksSchema = z
  .object({
    keys: z.array(JwkSchema).max(IdentityLimits.maxJwks),
  })
  .describe(
    'Active public keys to verify access tokens.',
  ) satisfies z.ZodType<Jwks>;
