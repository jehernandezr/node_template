import { z } from 'zod';
import { IdSchema, pageOf, TimestampSchema } from '@contracts/platform';
import { IdentityLimits } from '../constants/identity.constants.js';
import {
  FeatureFlag,
  Permission,
  PlanFeature,
  PlatformRole,
} from '../enums/access.enum.js';
import {
  ClientPlatform,
  RevocationReason,
  RevocationScope,
} from '../enums/auth.enum.js';
import type {
  DevicePage,
  DeviceSummary,
  GetUserAccessInput,
  RevokedSessions,
  RevokeSessionRequest,
  RevokeUserSessionsInput,
  SessionAccess,
  SessionPage,
  SessionRevokedPayload,
  SessionSummary,
  TokensRevokedPayload,
  UserAccess,
} from '../types/session.type.js';

export const PermissionSchema = z
  .enum(Permission)
  .describe('Permiso dentro de un tenant.') satisfies z.ZodType<Permission>;
export const PlatformRoleSchema = z
  .enum(PlatformRole)
  .describe('Rol de plataforma.') satisfies z.ZodType<PlatformRole>;
export const PlanFeatureSchema = z
  .enum(PlanFeature)
  .describe('Funcionalidad del plan.') satisfies z.ZodType<PlanFeature>;
export const FeatureFlagSchema = z
  .enum(FeatureFlag)
  .describe('Feature flag.') satisfies z.ZodType<FeatureFlag>;
export const ClientPlatformSchema = z
  .enum(ClientPlatform)
  .describe('Plataforma del cliente.') satisfies z.ZodType<ClientPlatform>;
export const RevocationReasonSchema = z
  .enum(RevocationReason)
  .describe('Motivo de una revocación.') satisfies z.ZodType<RevocationReason>;
export const RevocationScopeSchema = z
  .enum(RevocationScope)
  .describe(
    'Alcance de una revocación de tokens.',
  ) satisfies z.ZodType<RevocationScope>;

export const SessionSummarySchema = z
  .object({
    id: IdSchema,
    deviceName: z.string().min(1).max(IdentityLimits.deviceNameMaxLength),
    platform: ClientPlatformSchema,
    lastSeenAt: TimestampSchema,
    current: z.boolean(),
  })
  .describe(
    'Sesión activa en un dispositivo.',
  ) satisfies z.ZodType<SessionSummary>;

export const DeviceSummarySchema = z
  .object({
    id: IdSchema,
    name: z.string().min(1).max(IdentityLimits.deviceNameMaxLength),
    platform: ClientPlatformSchema,
    lastSeenAt: TimestampSchema,
    trustedUntil: TimestampSchema.optional(),
    verifier: z.boolean(),
  })
  .describe(
    'Dispositivo con confianza vigente.',
  ) satisfies z.ZodType<DeviceSummary>;

export const SessionPageSchema = pageOf(
  SessionSummarySchema,
  'Página de sesiones.',
) satisfies z.ZodType<SessionPage>;

export const DevicePageSchema = pageOf(
  DeviceSummarySchema,
  'Página de dispositivos.',
) satisfies z.ZodType<DevicePage>;

export const RevokeSessionRequestSchema = z
  .strictObject({ sessionId: IdSchema })
  .describe('Sesión a cerrar.') satisfies z.ZodType<RevokeSessionRequest>;

export const RevokedSessionsSchema = z
  .object({ revoked: z.int().min(0) })
  .describe(
    'Cantidad de sesiones cerradas.',
  ) satisfies z.ZodType<RevokedSessions>;

export const RevokeUserSessionsInputSchema = z
  .strictObject({ userId: IdSchema, reason: RevocationReasonSchema })
  .describe(
    'Revoca todas las sesiones de un usuario.',
  ) satisfies z.ZodType<RevokeUserSessionsInput>;

export const GetUserAccessInputSchema = z
  .strictObject({ userId: IdSchema, tenantId: IdSchema })
  .describe(
    'Usuario y tenant a consultar.',
  ) satisfies z.ZodType<GetUserAccessInput>;

export const UserAccessSchema = z
  .object({
    permissions: z.array(PermissionSchema),
    platformRoles: z.array(PlatformRoleSchema),
    features: z.array(PlanFeatureSchema),
    flags: z.array(FeatureFlagSchema),
  })
  .describe(
    'Acceso efectivo de un usuario en un tenant.',
  ) satisfies z.ZodType<UserAccess>;

export const SessionAccessSchema = z
  .object({
    userId: IdSchema,
    tenantId: IdSchema,
    sessionId: IdSchema,
    ...UserAccessSchema.shape,
    mfaVerifiedAt: TimestampSchema.nullable(),
  })
  .describe(
    'Acceso de la sesión actual: usuario, tenant, permisos, roles, plan, flags y último MFA.',
  ) satisfies z.ZodType<SessionAccess>;

export const SessionRevokedPayloadSchema = z
  .object({
    sessionId: IdSchema,
    userId: IdSchema,
    tenantId: IdSchema,
    reason: RevocationReasonSchema,
    revokedAt: TimestampSchema,
  })
  .describe('Se revocó una sesión.') satisfies z.ZodType<SessionRevokedPayload>;

export const TokensRevokedPayloadSchema = z
  .object({
    scope: RevocationScopeSchema,
    subjectId: IdSchema,
    revokedBefore: TimestampSchema,
  })
  .describe(
    'Se revocaron tokens de una sesión, un usuario o un tenant.',
  ) satisfies z.ZodType<TokensRevokedPayload>;
