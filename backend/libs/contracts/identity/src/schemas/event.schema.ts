import { z } from 'zod';
import { IdSchema, TimestampSchema } from '@contracts/platform';
import { IdentityLimits } from '../constants/identity.constants.js';
import { ApiKeyEnvironment } from '../enums/api-key.enum.js';
import { ClientPlatform } from '../enums/auth.enum.js';
import { MembershipChangeKind, TenantKind } from '../enums/tenant.enum.js';
import type {
  ApiKeyCreatedPayload,
  ApiKeyRevokedPayload,
} from '../types/api-key.type.js';
import type {
  DeviceRegisteredPayload,
  DeviceRemovedPayload,
} from '../types/device.type.js';
import type {
  MembershipChangedPayload,
  PermissionsChangedPayload,
} from '../types/access.type.js';
import type { SecurityAlertRaisedPayload } from '../types/security.type.js';
import type {
  TenantCreatedPayload,
  TenantReactivatedPayload,
  TenantSuspendedPayload,
} from '../types/tenant.type.js';
import type {
  UserEmailChangedPayload,
  UserReactivatedPayload,
  UserRegisteredPayload,
  UserSuspendedPayload,
} from '../types/user.type.js';
import { SecurityAlertTypeSchema } from './user.schema.js';

const ReasonFieldSchema = z.string().min(1).max(IdentityLimits.reasonMaxLength);

export const UserRegisteredPayloadSchema = z
  .object({
    userId: IdSchema,
    homeTenantId: IdSchema,
    registeredAt: TimestampSchema,
  })
  .describe(
    'A user was registered.',
  ) satisfies z.ZodType<UserRegisteredPayload>;

export const UserSuspendedPayloadSchema = z
  .object({
    userId: IdSchema,
    reason: ReasonFieldSchema.optional(),
    suspendedAt: TimestampSchema,
  })
  .describe('A user was suspended.') satisfies z.ZodType<UserSuspendedPayload>;

export const UserReactivatedPayloadSchema = z
  .object({
    userId: IdSchema,
    reactivatedAt: TimestampSchema,
  })
  .describe(
    'A user was reactivated.',
  ) satisfies z.ZodType<UserReactivatedPayload>;

export const UserEmailChangedPayloadSchema = z
  .object({
    userId: IdSchema,
    changedAt: TimestampSchema,
  })
  .describe(
    'The email of a user changed.',
  ) satisfies z.ZodType<UserEmailChangedPayload>;

export const DeviceRegisteredPayloadSchema = z
  .object({
    userId: IdSchema,
    deviceId: IdSchema,
    platform: z.enum(ClientPlatform),
    verifier: z.boolean(),
    registeredAt: TimestampSchema,
  })
  .describe(
    'A verifier device was registered.',
  ) satisfies z.ZodType<DeviceRegisteredPayload>;

export const DeviceRemovedPayloadSchema = z
  .object({
    userId: IdSchema,
    deviceId: IdSchema,
    removedAt: TimestampSchema,
  })
  .describe(
    'A device was removed from the account.',
  ) satisfies z.ZodType<DeviceRemovedPayload>;

export const TenantCreatedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    slug: z
      .string()
      .min(IdentityLimits.tenantSlugMinLength)
      .max(IdentityLimits.tenantSlugMaxLength),
    kind: z.enum(TenantKind),
    region: z.string().min(1).max(IdentityLimits.regionMaxLength),
    ownerUserId: IdSchema.optional(),
    createdAt: TimestampSchema,
  })
  .describe('A tenant was created.') satisfies z.ZodType<TenantCreatedPayload>;

export const TenantSuspendedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    suspendedAt: TimestampSchema,
  })
  .describe(
    'A tenant was suspended.',
  ) satisfies z.ZodType<TenantSuspendedPayload>;

export const TenantReactivatedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    reactivatedAt: TimestampSchema,
  })
  .describe(
    'A tenant was reactivated.',
  ) satisfies z.ZodType<TenantReactivatedPayload>;

export const MembershipChangedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    userId: IdSchema,
    kind: z.enum(MembershipChangeKind),
    groupIds: z.array(IdSchema).max(IdentityLimits.maxGroupsPerMember),
    changedAt: TimestampSchema,
  })
  .describe(
    'The membership of a user in a tenant changed.',
  ) satisfies z.ZodType<MembershipChangedPayload>;

export const PermissionsChangedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    userId: IdSchema.optional(),
    permissionVersion: z
      .string()
      .max(IdentityLimits.permissionVersionMaxLength)
      .regex(/^\d+\.\d+$/),
    changedAt: TimestampSchema,
  })
  .describe(
    'The permissions of a user or a tenant changed.',
  ) satisfies z.ZodType<PermissionsChangedPayload>;

export const ApiKeyCreatedPayloadSchema = z
  .object({
    apiKeyId: IdSchema,
    serviceAccountId: IdSchema,
    tenantId: IdSchema,
    prefix: z
      .string()
      .min(IdentityLimits.apiKeyPrefixLength)
      .max(IdentityLimits.apiKeyPrefixLength),
    environment: z.enum(ApiKeyEnvironment),
    createdBy: IdSchema,
    createdAt: TimestampSchema,
  })
  .describe(
    'An API key was created. It does not include the secret.',
  ) satisfies z.ZodType<ApiKeyCreatedPayload>;

export const ApiKeyRevokedPayloadSchema = z
  .object({
    apiKeyId: IdSchema,
    tenantId: IdSchema,
    prefix: z
      .string()
      .min(IdentityLimits.apiKeyPrefixLength)
      .max(IdentityLimits.apiKeyPrefixLength),
    revokedAt: TimestampSchema,
  })
  .describe(
    'An API key was revoked.',
  ) satisfies z.ZodType<ApiKeyRevokedPayload>;

export const SecurityAlertRaisedPayloadSchema = z
  .object({
    alertId: IdSchema,
    userId: IdSchema,
    type: SecurityAlertTypeSchema,
    raisedAt: TimestampSchema,
  })
  .describe(
    'A security alert was raised on an account.',
  ) satisfies z.ZodType<SecurityAlertRaisedPayload>;
