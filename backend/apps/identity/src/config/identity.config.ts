import { z } from 'zod';
import { TokenAudience } from '@contracts/identity';
import { IdSchema } from '@contracts/platform';
import {
  internalHttpConfigSchema,
  regionsConfigSchema,
} from '@platform/service';
import {
  DeployEnvironment,
  EnvironmentAllowance,
  envDuration,
  envList,
  envNumber,
  secret,
  serviceConfigSchema,
} from '@platform/config';
import { IdentityDefaults } from '../shared/constants/identity-defaults.constants.js';
import { IdentityMailerKind } from './identity-mailer-kind.enum.js';

/** Outside `local`, identity sends its email through notifications only (ADR 0046). */
const MAILER = new EnvironmentAllowance<IdentityMailerKind>('IDENTITY_MAILER', {
  [DeployEnvironment.Dev]: [IdentityMailerKind.Notifications],
  [DeployEnvironment.Staging]: [IdentityMailerKind.Notifications],
  [DeployEnvironment.Prod]: [IdentityMailerKind.Notifications],
});

/**
 * Identity configuration. `WEB_ORIGINS` and `TRUST_PROXY_HOPS` are not here: `@platform/http` reads them.
 */
export const identityConfigSchema = serviceConfigSchema
  .extend({
    IDENTITY_REGION: z.string().trim().min(1).max(32),
    /**
     * The process region for routing (`@platform/service`): it is `IDENTITY_REGION` and it is required when
     * `REGIONS` declares regions, because without it the router does not reject tenants from another region.
     */
    SERVICE_REGION: z.string().trim().min(1).max(32).optional(),
    REGIONS: regionsConfigSchema.shape.REGIONS,
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
    /**
     * The smoke account as JSON, `{ "email", "password", "totpSecret" }`: when set, the seed creates or resets it.
     * Only the seed task receives it, and `prod` rejects it.
     */
    IDENTITY_SMOKE_ACCOUNT: secret({ minLength: 2 }).optional(),
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
        message: 'AUTH_ISSUER must equal IDENTITY_ISSUER',
      });
    }
    if (config.REGIONS.length > 0 && config.SERVICE_REGION === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['SERVICE_REGION'],
        message: 'SERVICE_REGION is required when REGIONS declares regions',
      });
    }
    if (
      config.SERVICE_REGION !== undefined &&
      config.SERVICE_REGION !== config.IDENTITY_REGION
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['IDENTITY_REGION'],
        message: 'IDENTITY_REGION must equal SERVICE_REGION',
      });
    }
    if (config.SESSION_ABSOLUTE_TTL < config.SESSION_IDLE_TTL) {
      ctx.addIssue({
        code: 'custom',
        path: ['SESSION_ABSOLUTE_TTL'],
        message: 'SESSION_ABSOLUTE_TTL cannot be less than SESSION_IDLE_TTL',
      });
    }
    MAILER.check(config.DEPLOY_ENVIRONMENT, config.IDENTITY_MAILER, ctx);
    if (
      config.DEPLOY_ENVIRONMENT === DeployEnvironment.Prod &&
      config.IDENTITY_SMOKE_ACCOUNT !== undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['IDENTITY_SMOKE_ACCOUNT'],
        message: 'IDENTITY_SMOKE_ACCOUNT is not allowed in prod',
      });
    }
  });

export type IdentityConfig = z.output<typeof identityConfigSchema>;
