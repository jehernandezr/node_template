import { z } from 'zod';
import {
  CursorSchema,
  IdSchema,
  PageLimitSchema,
  pageOf,
  TimestampSchema,
  UserRefSchema,
} from '@contracts/platform';
import { IdentityLimits } from '../constants/identity.constants.js';
import { Permission } from '../enums/access.enum.js';
import { ClientPlatform } from '../enums/auth.enum.js';
import { IdentitySaga, IdentitySagaStatus } from '../enums/identifiers.enum.js';
import type {
  AccountDeletionStarted,
  EraseUserInput,
  EraseUserResult,
  GetSagaRequest,
  ListMembersByPermissionInput,
  ListPushTargetsInput,
  PushTarget,
  PushTargets,
  SagaSummary,
  TenantCreation,
  UserErasedPayload,
  UserRefPage,
} from '../types/orchestration.type.js';

export const IdentitySagaSchema = z
  .enum(IdentitySaga)
  .describe('Saga orchestrated by identity.') satisfies z.ZodType<IdentitySaga>;

export const IdentitySagaStatusSchema = z
  .enum(IdentitySagaStatus)
  .describe(
    'Status of an identity saga.',
  ) satisfies z.ZodType<IdentitySagaStatus>;

export const TenantCreationSchema = z
  .object({ tenantId: IdSchema, sagaId: IdSchema })
  .describe(
    'Tenant being provisioned and the saga that activates it.',
  ) satisfies z.ZodType<TenantCreation>;

export const AccountDeletionStartedSchema = z
  .object({ sagaId: IdSchema })
  .describe(
    'Saga that deletes the user account.',
  ) satisfies z.ZodType<AccountDeletionStarted>;

export const GetSagaRequestSchema = z
  .strictObject({ sagaId: IdSchema })
  .describe('Saga to query.') satisfies z.ZodType<GetSagaRequest>;

export const SagaSummarySchema = z
  .object({
    sagaId: IdSchema,
    saga: IdentitySagaSchema,
    status: IdentitySagaStatusSchema,
    startedAt: TimestampSchema,
    finishedAt: TimestampSchema.nullable(),
  })
  .describe('Status of an identity saga.') satisfies z.ZodType<SagaSummary>;

export const EraseUserInputSchema = z
  .strictObject({ userId: IdSchema })
  .describe(
    'User whose personal data is erased.',
  ) satisfies z.ZodType<EraseUserInput>;

export const EraseUserResultSchema = z
  .object({ userId: IdSchema, erasedAt: TimestampSchema })
  .describe('Result of erasing a user.') satisfies z.ZodType<EraseUserResult>;

export const ListPushTargetsInputSchema = z
  .strictObject({ user: UserRefSchema })
  .describe(
    'User whose push devices are requested.',
  ) satisfies z.ZodType<ListPushTargetsInput>;

export const PushTargetSchema = z
  .object({
    deviceId: IdSchema,
    platform: z.enum(ClientPlatform),
    pushToken: z.string().min(1).max(IdentityLimits.devicePushTokenMaxLength),
  })
  .describe('Device that can receive a push.') satisfies z.ZodType<PushTarget>;

export const PushTargetsSchema = z
  .object({
    targets: z.array(PushTargetSchema).max(IdentityLimits.maxPushTargets),
  })
  .describe('Push devices of a user.') satisfies z.ZodType<PushTargets>;

export const ListMembersByPermissionInputSchema = z
  .strictObject({
    tenantId: IdSchema,
    permission: z.enum(Permission),
    limit: PageLimitSchema.optional(),
    after: CursorSchema.optional(),
  })
  .describe(
    'Members of a tenant that have a permission.',
  ) satisfies z.ZodType<ListMembersByPermissionInput>;

export const UserRefPageSchema = pageOf(
  UserRefSchema,
  'Page of users.',
) satisfies z.ZodType<UserRefPage>;

export const UserErasedPayloadSchema = z
  .object({
    userId: IdSchema,
    homeTenantId: IdSchema,
    erasedAt: TimestampSchema,
  })
  .describe('A user was erased.') satisfies z.ZodType<UserErasedPayload>;
