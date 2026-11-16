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
  .describe('Saga que orquesta identity.') satisfies z.ZodType<IdentitySaga>;

export const IdentitySagaStatusSchema = z
  .enum(IdentitySagaStatus)
  .describe(
    'Estado de una saga de identity.',
  ) satisfies z.ZodType<IdentitySagaStatus>;

export const TenantCreationSchema = z
  .object({ tenantId: IdSchema, sagaId: IdSchema })
  .describe(
    'Tenant en aprovisionamiento y la saga que lo activa.',
  ) satisfies z.ZodType<TenantCreation>;

export const AccountDeletionStartedSchema = z
  .object({ sagaId: IdSchema })
  .describe(
    'Saga que borra la cuenta del usuario.',
  ) satisfies z.ZodType<AccountDeletionStarted>;

export const GetSagaRequestSchema = z
  .strictObject({ sagaId: IdSchema })
  .describe('Saga a consultar.') satisfies z.ZodType<GetSagaRequest>;

export const SagaSummarySchema = z
  .object({
    sagaId: IdSchema,
    saga: IdentitySagaSchema,
    status: IdentitySagaStatusSchema,
    startedAt: TimestampSchema,
    finishedAt: TimestampSchema.nullable(),
  })
  .describe('Estado de una saga de identity.') satisfies z.ZodType<SagaSummary>;

export const EraseUserInputSchema = z
  .strictObject({ userId: IdSchema })
  .describe(
    'Usuario cuyos datos personales se borran.',
  ) satisfies z.ZodType<EraseUserInput>;

export const EraseUserResultSchema = z
  .object({ userId: IdSchema, erasedAt: TimestampSchema })
  .describe(
    'Resultado de borrar a un usuario.',
  ) satisfies z.ZodType<EraseUserResult>;

export const ListPushTargetsInputSchema = z
  .strictObject({ user: UserRefSchema })
  .describe(
    'Usuario cuyos dispositivos con push se piden.',
  ) satisfies z.ZodType<ListPushTargetsInput>;

export const PushTargetSchema = z
  .object({
    deviceId: IdSchema,
    platform: z.enum(ClientPlatform),
    pushToken: z.string().min(1).max(IdentityLimits.devicePushTokenMaxLength),
  })
  .describe(
    'Dispositivo al que se puede enviar un push.',
  ) satisfies z.ZodType<PushTarget>;

export const PushTargetsSchema = z
  .object({
    targets: z.array(PushTargetSchema).max(IdentityLimits.maxPushTargets),
  })
  .describe(
    'Dispositivos con push de un usuario.',
  ) satisfies z.ZodType<PushTargets>;

export const ListMembersByPermissionInputSchema = z
  .strictObject({
    tenantId: IdSchema,
    permission: z.enum(Permission),
    limit: PageLimitSchema.optional(),
    after: CursorSchema.optional(),
  })
  .describe(
    'Miembros de un tenant que tienen un permiso.',
  ) satisfies z.ZodType<ListMembersByPermissionInput>;

export const UserRefPageSchema = pageOf(
  UserRefSchema,
  'Página de usuarios.',
) satisfies z.ZodType<UserRefPage>;

export const UserErasedPayloadSchema = z
  .object({
    userId: IdSchema,
    homeTenantId: IdSchema,
    erasedAt: TimestampSchema,
  })
  .describe('Se borró a un usuario.') satisfies z.ZodType<UserErasedPayload>;
