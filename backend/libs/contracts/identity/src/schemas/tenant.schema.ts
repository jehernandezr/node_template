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
  .describe('Rol de sistema de un tenant.') satisfies z.ZodType<TenantRole>;

export const TenantKindSchema = z
  .enum(TenantKind)
  .describe('Tipo de tenant.') satisfies z.ZodType<TenantKind>;

export const TenantLifecycleSchema = z
  .enum(TenantLifecycle)
  .describe('Ciclo de vida de un tenant.') satisfies z.ZodType<TenantLifecycle>;

export const MembershipChangeKindSchema = z
  .enum(MembershipChangeKind)
  .describe(
    'Qué cambió en la membresía de un usuario.',
  ) satisfies z.ZodType<MembershipChangeKind>;

/** Identificador legible del tenant: minúsculas, dígitos y guiones internos. */
export const TenantSlugSchema = z
  .string()
  .min(IdentityLimits.tenantSlugMinLength)
  .max(IdentityLimits.tenantSlugMaxLength)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .describe('Identificador legible del tenant.') satisfies z.ZodType<string>;

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
    'Tenant visible para sus miembros.',
  ) satisfies z.ZodType<TenantSummary>;

export const CreateTenantRequestSchema = z
  .strictObject({
    slug: TenantSlugSchema,
    name: TenantNameFieldSchema,
    region: TenantRegionFieldSchema.optional(),
  })
  .describe(
    'Alta de un tenant del usuario.',
  ) satisfies z.ZodType<CreateTenantRequest>;

export const UpdateTenantRequestSchema = z
  .strictObject({ name: TenantNameFieldSchema.optional() })
  .describe(
    'Cambios parciales del tenant actual.',
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
    'Tenant del usuario con la fecha en que se unió.',
  ) satisfies z.ZodType<MyTenantSummary>;

export const MyTenantPageSchema = pageOf(
  MyTenantSummarySchema,
  'Página de tenants del usuario.',
) satisfies z.ZodType<MyTenantPage>;

export const SwitchTenantRequestSchema = z
  .strictObject({ tenantId: IdSchema })
  .describe(
    'Tenant al que cambia la sesión abierta.',
  ) satisfies z.ZodType<SwitchTenantRequest>;

export const TenantOperationResultSchema = z
  .object({ tenantId: IdSchema, status: TenantLifecycleSchema })
  .describe(
    'Resultado de una operación sobre el ciclo de vida de un tenant.',
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
    'Crea un tenant en aprovisionamiento con su dueño.',
  ) satisfies z.ZodType<CreateTenantInput>;

export const TenantRefInputSchema = z
  .strictObject({ tenantId: IdSchema })
  .describe(
    'Tenant a consultar o cambiar.',
  ) satisfies z.ZodType<TenantRefInput>;

export const SuspendTenantInputSchema = z
  .strictObject({
    tenantId: IdSchema,
    reason: ReasonFieldSchema.optional(),
  })
  .describe(
    'Suspende un tenant y revoca sus tokens.',
  ) satisfies z.ZodType<SuspendTenantInput>;
