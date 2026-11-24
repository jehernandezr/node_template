import { z } from 'zod';
import { TokenAudience } from '@contracts/identity';
import { IdSchema } from '@contracts/platform';
import { internalHttpConfigSchema } from '@platform/service';
import {
  envDuration,
  envList,
  envNumber,
  NodeEnv,
  secret,
  serviceConfigSchema,
} from '@platform/config';
import { IdentityDefaults } from '../shared/constants/identity-defaults.constants.js';
import { IdentityMailerKind } from './identity-mailer-kind.enum.js';

/**
 * Configuración de identity. `WEB_ORIGINS` y `TRUST_PROXY_HOPS` no están aquí: los lee `@platform/http`.
 */
export const identityConfigSchema = serviceConfigSchema
  .extend({
    IDENTITY_REGION: z.string().trim().min(1).max(32),
    /** La región del proceso para el enrutamiento (`@platform/service`); si se declara, es `IDENTITY_REGION`. */
    SERVICE_REGION: z.string().trim().min(1).max(32).optional(),
    IDENTITY_ISSUER: z.url(),
    AUTH_ISSUER: z.url(),
    AUTH_JWKS_URL: z.url(),
    IDENTITY_AUDIENCES: envList()
      .pipe(z.array(z.enum(TokenAudience)).min(1))
      .default([TokenAudience.Api]),
    IDENTITY_SIGNING_KEYS: secret({ minLength: 2 }),
    IDENTITY_EMAIL_PEPPER: secret({ minLength: 32 }),
    IDENTITY_TOKEN_PEPPER: secret({ minLength: 32 }),
    IDENTITY_API_KEY_PEPPER: secret({ minLength: 32 }),
    IDENTITY_DEVICE_ID_KEY: secret({ minLength: 32 }),
    IDENTITY_DATA_KEY: secret({ minLength: 32 }),
    ...internalHttpConfigSchema.shape,
    ACCESS_TOKEN_TTL: envDuration()
      .pipe(z.number().min(600_000).max(900_000))
      .default(IdentityDefaults.defaultAccessTokenTtlMs),
    SESSION_IDLE_TTL: envDuration().default(
      IdentityDefaults.defaultSessionIdleTtlMs,
    ),
    SESSION_ABSOLUTE_TTL: envDuration().default(
      IdentityDefaults.defaultSessionAbsoluteTtlMs,
    ),
    IDENTITY_DEFAULT_TENANT_ID: IdSchema,
    IDENTITY_PLATFORM_TENANT_ID: IdSchema,
    WEBAUTHN_RP_ID: z.string().trim().min(1),
    WEBAUTHN_RP_NAME: z.string().trim().min(1),
    WEBAUTHN_ORIGINS: envList().pipe(z.array(z.url()).min(1)),
    MFA_RECOVERY_BASE_HOURS: envNumber({ min: 1 }).default(
      IdentityDefaults.defaultMfaRecoveryBaseHours,
    ),
    API_KEY_ROTATION_GRACE_HOURS: envNumber({ min: 1 }).default(
      IdentityDefaults.defaultApiKeyRotationGraceHours,
    ),
    IDENTITY_MAILER: z
      .enum(IdentityMailerKind)
      .default(IdentityMailerKind.Memory),
  })
  .superRefine((config, ctx) => {
    if (config.AUTH_ISSUER !== config.IDENTITY_ISSUER) {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_ISSUER'],
        message: 'AUTH_ISSUER debe ser igual a IDENTITY_ISSUER',
      });
    }
    if (
      config.SERVICE_REGION !== undefined &&
      config.SERVICE_REGION !== config.IDENTITY_REGION
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['IDENTITY_REGION'],
        message: 'IDENTITY_REGION debe ser igual a SERVICE_REGION',
      });
    }
    if (config.SESSION_ABSOLUTE_TTL < config.SESSION_IDLE_TTL) {
      ctx.addIssue({
        code: 'custom',
        path: ['SESSION_ABSOLUTE_TTL'],
        message: 'SESSION_ABSOLUTE_TTL no puede ser menor que SESSION_IDLE_TTL',
      });
    }
    if (
      config.IDENTITY_MAILER === IdentityMailerKind.Console &&
      config.NODE_ENV !== NodeEnv.Development
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['IDENTITY_MAILER'],
        message:
          'IDENTITY_MAILER=console solo se permite con NODE_ENV=development',
      });
    }
  });

export type IdentityConfig = z.output<typeof identityConfigSchema>;
