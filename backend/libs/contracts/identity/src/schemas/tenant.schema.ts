import { z } from 'zod';
import { IdSchema, pageOf, TimestampSchema } from '@contracts/platform';
import { IdentityLimits } from '../constants/identity.constants.js';
import {
  MembershipChangeKind,
  TenantKind,
  TenantLifecycle,
  TenantRole,
} from '../enums/tenant.enum.js';
import type {
  CreateTenantInput,
  CreateTenantRequest,
  MyTenantPage,
  MyTenantSummary,
  SuspendTenantInput,
  SwitchTenantRequest,
  TenantOperationResult,
  TenantRefInput,
  TenantSummary,
  UpdateTenantRequest,
} from '../types/tenant.type.js';

export const TenantRoleSchema = z
  .enum(TenantRole)
  .describe('System role of a tenant.') satisfies z.ZodType<TenantRole>;

export const TenantKindSchema = z
  .enum(TenantKind)
  .describe('Tenant type.') satisfies z.ZodType<TenantKind>;

export const TenantLifecycleSchema = z
  .enum(TenantLifecycle)
  .describe('Lifecycle of a tenant.') satisfies z.ZodType<TenantLifecycle>;

export const MembershipChangeKindSchema = z
  .enum(MembershipChangeKind)
  .describe(
    'What changed in the membership of a user.',
  ) satisfies z.ZodType<MembershipChangeKind>;

/** Human-readable tenant identifier: lowercase letters, digits and inner hyphens. */
export const TenantSlugSchema = z
  .string()
  .min(IdentityLimits.tenantSlugMinLength)
  .max(IdentityLimits.tenantSlugMaxLength)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .describe('Readable identifier of the tenant.') satisfies z.ZodType<string>;

const TenantNameFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.tenantNameMaxLength);

const TenantRegionFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.regionMaxLength);

const ReasonFieldSchema = z.string().min(1).max(IdentityLimits.reasonMaxLength);

export const TenantSummarySchema = z
  .object({
    id: IdSchema,
    slug: TenantSlugSchema,
    name: TenantNameFieldSchema,
    region: TenantRegionFieldSchema,
    kind: TenantKindSchema,
    status: TenantLifecycleSchema,
  })
  .describe(
    'Tenant visible to its members.',
  ) satisfies z.ZodType<TenantSummary>;

export const CreateTenantRequestSchema = z
  .strictObject({
    slug: TenantSlugSchema,
    name: TenantNameFieldSchema,
    region: TenantRegionFieldSchema.optional(),
  })
  .describe(
    'Creation of a tenant by the user.',
  ) satisfies z.ZodType<CreateTenantRequest>;

export const UpdateTenantRequestSchema = z
  .strictObject({ name: TenantNameFieldSchema.optional() })
  .describe(
    'Partial changes of the current tenant.',
  ) satisfies z.ZodType<UpdateTenantRequest>;

export const MyTenantSummarySchema = z
  .object({
    id: IdSchema,
    slug: TenantSlugSchema,
    name: TenantNameFieldSchema,
    kind: TenantKindSchema,
    status: TenantLifecycleSchema,
    joinedAt: TimestampSchema,
  })
  .describe(
    'Tenant of the user with the date they joined.',
  ) satisfies z.ZodType<MyTenantSummary>;

export const MyTenantPageSchema = pageOf(
  MyTenantSummarySchema,
  'Page of the user tenants.',
) satisfies z.ZodType<MyTenantPage>;

export const SwitchTenantRequestSchema = z
  .strictObject({ tenantId: IdSchema })
  .describe(
    'Tenant the open session switches to.',
  ) satisfies z.ZodType<SwitchTenantRequest>;

export const TenantOperationResultSchema = z
  .object({ tenantId: IdSchema, status: TenantLifecycleSchema })
  .describe(
    'Result of an operation on the lifecycle of a tenant.',
  ) satisfies z.ZodType<TenantOperationResult>;

export const CreateTenantInputSchema = z
  .strictObject({
    tenantId: IdSchema,
    slug: TenantSlugSchema,
    name: TenantNameFieldSchema,
    region: TenantRegionFieldSchema,
    kind: TenantKindSchema,
    ownerUserId: IdSchema,
  })
  .describe(
    'Creates a tenant being provisioned with its owner.',
  ) satisfies z.ZodType<CreateTenantInput>;

export const TenantRefInputSchema = z
  .strictObject({ tenantId: IdSchema })
  .describe('Tenant to query or change.') satisfies z.ZodType<TenantRefInput>;

export const SuspendTenantInputSchema = z
  .strictObject({
    tenantId: IdSchema,
    reason: ReasonFieldSchema.optional(),
  })
  .describe(
    'Suspends a tenant and revokes its tokens.',
  ) satisfies z.ZodType<SuspendTenantInput>;
