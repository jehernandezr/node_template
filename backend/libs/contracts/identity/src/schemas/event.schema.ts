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
    'Se registró un usuario.',
  ) satisfies z.ZodType<UserRegisteredPayload>;

export const UserSuspendedPayloadSchema = z
  .object({
    userId: IdSchema,
    reason: ReasonFieldSchema.optional(),
    suspendedAt: TimestampSchema,
  })
  .describe(
    'Se suspendió un usuario.',
  ) satisfies z.ZodType<UserSuspendedPayload>;

export const UserReactivatedPayloadSchema = z
  .object({
    userId: IdSchema,
    reactivatedAt: TimestampSchema,
  })
  .describe(
    'Se reactivó un usuario.',
  ) satisfies z.ZodType<UserReactivatedPayload>;

export const UserEmailChangedPayloadSchema = z
  .object({
    userId: IdSchema,
    changedAt: TimestampSchema,
  })
  .describe(
    'Cambió el email de un usuario.',
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
    'Se registró un dispositivo verificador.',
  ) satisfies z.ZodType<DeviceRegisteredPayload>;

export const DeviceRemovedPayloadSchema = z
  .object({
    userId: IdSchema,
    deviceId: IdSchema,
    removedAt: TimestampSchema,
  })
  .describe(
    'Se quitó un dispositivo de la cuenta.',
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
    ownerUserId: IdSchema,
    createdAt: TimestampSchema,
  })
  .describe('Se creó un tenant.') satisfies z.ZodType<TenantCreatedPayload>;

export const TenantSuspendedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    suspendedAt: TimestampSchema,
  })
  .describe(
    'Se suspendió un tenant.',
  ) satisfies z.ZodType<TenantSuspendedPayload>;

export const TenantReactivatedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    reactivatedAt: TimestampSchema,
  })
  .describe(
    'Se reactivó un tenant.',
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
    'Cambió la membresía de un usuario en un tenant.',
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
    'Cambiaron los permisos de un usuario o de un tenant.',
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
    'Se creó una API key. No incluye el secreto.',
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
  .describe('Se revocó una API key.') satisfies z.ZodType<ApiKeyRevokedPayload>;

export const SecurityAlertRaisedPayloadSchema = z
  .object({
    alertId: IdSchema,
    userId: IdSchema,
    type: SecurityAlertTypeSchema,
    raisedAt: TimestampSchema,
  })
  .describe(
    'Se levantó una alerta de seguridad sobre una cuenta.',
  ) satisfies z.ZodType<SecurityAlertRaisedPayload>;
