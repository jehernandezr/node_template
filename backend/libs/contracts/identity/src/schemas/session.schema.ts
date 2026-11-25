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
  .describe('Permission within a tenant.') satisfies z.ZodType<Permission>;
export const PlatformRoleSchema = z
  .enum(PlatformRole)
  .describe('Platform role.') satisfies z.ZodType<PlatformRole>;
export const PlanFeatureSchema = z
  .enum(PlanFeature)
  .describe('Plan feature.') satisfies z.ZodType<PlanFeature>;
export const FeatureFlagSchema = z
  .enum(FeatureFlag)
  .describe('Feature flag.') satisfies z.ZodType<FeatureFlag>;
export const ClientPlatformSchema = z
  .enum(ClientPlatform)
  .describe('Client platform.') satisfies z.ZodType<ClientPlatform>;
export const RevocationReasonSchema = z
  .enum(RevocationReason)
  .describe('Reason for a revocation.') satisfies z.ZodType<RevocationReason>;
export const RevocationScopeSchema = z
  .enum(RevocationScope)
  .describe(
    'Scope of a token revocation.',
  ) satisfies z.ZodType<RevocationScope>;

export const SessionSummarySchema = z
  .object({
    id: IdSchema,
    deviceName: z.string().min(1).max(IdentityLimits.deviceNameMaxLength),
    platform: ClientPlatformSchema,
    lastSeenAt: TimestampSchema,
    current: z.boolean(),
  })
  .describe('Active session on a device.') satisfies z.ZodType<SessionSummary>;

export const DeviceSummarySchema = z
  .object({
    id: IdSchema,
    name: z.string().min(1).max(IdentityLimits.deviceNameMaxLength),
    platform: ClientPlatformSchema,
    lastSeenAt: TimestampSchema,
    trustedUntil: TimestampSchema.optional(),
    verifier: z.boolean(),
  })
  .describe('Device with active trust.') satisfies z.ZodType<DeviceSummary>;

export const SessionPageSchema = pageOf(
  SessionSummarySchema,
  'Page of sessions.',
) satisfies z.ZodType<SessionPage>;

export const DevicePageSchema = pageOf(
  DeviceSummarySchema,
  'Page of devices.',
) satisfies z.ZodType<DevicePage>;

export const RevokeSessionRequestSchema = z
  .strictObject({ sessionId: IdSchema })
  .describe('Session to close.') satisfies z.ZodType<RevokeSessionRequest>;

export const RevokedSessionsSchema = z
  .object({ revoked: z.int().min(0) })
  .describe('Number of closed sessions.') satisfies z.ZodType<RevokedSessions>;

export const RevokeUserSessionsInputSchema = z
  .strictObject({ userId: IdSchema, reason: RevocationReasonSchema })
  .describe(
    'Revokes all sessions of a user.',
  ) satisfies z.ZodType<RevokeUserSessionsInput>;

export const GetUserAccessInputSchema = z
  .strictObject({ userId: IdSchema, tenantId: IdSchema })
  .describe(
    'User and tenant to query.',
  ) satisfies z.ZodType<GetUserAccessInput>;

export const UserAccessSchema = z
  .object({
    permissions: z.array(PermissionSchema),
    roles: z
      .array(z.string().min(1).max(IdentityLimits.roleNameMaxLength))
      .max(IdentityLimits.maxRolesPerUser),
    permissionVersion: z
      .string()
      .max(IdentityLimits.permissionVersionMaxLength)
      .regex(/^\d+\.\d+$/),
    platformRoles: z.array(PlatformRoleSchema),
    features: z.array(PlanFeatureSchema),
    flags: z.array(FeatureFlagSchema),
  })
  .describe(
    'Effective access of a user in a tenant.',
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
    'Access of the current session: user, tenant, permissions, roles, plan, flags and last MFA.',
  ) satisfies z.ZodType<SessionAccess>;

export const SessionRevokedPayloadSchema = z
  .object({
    sessionId: IdSchema,
    userId: IdSchema,
    tenantId: IdSchema,
    reason: RevocationReasonSchema,
    revokedAt: TimestampSchema,
  })
  .describe(
    'A session was revoked.',
  ) satisfies z.ZodType<SessionRevokedPayload>;

export const TokensRevokedPayloadSchema = z
  .object({
    scope: RevocationScopeSchema,
    subjectId: IdSchema,
    revokedBefore: TimestampSchema,
  })
  .describe(
    'Tokens of a session, a user or a tenant were revoked.',
  ) satisfies z.ZodType<TokensRevokedPayload>;
