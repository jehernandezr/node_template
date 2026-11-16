import { z } from 'zod';
import { IdSchema, pageOf, TimestampSchema } from '@contracts/platform';
import { IdentityLimits } from '../constants/identity.constants.js';
import { InvitationStatus } from '../enums/tenant.enum.js';
import type {
  AcceptInvitationRequest,
  InvitationPage,
  InvitationSummary,
  InviteUserRequest,
  RevokeInvitationRequest,
} from '../types/invitation.type.js';
import { ActionTokenFieldSchema, EmailFieldSchema } from './user.schema.js';

export const InvitationStatusSchema = z
  .enum(InvitationStatus)
  .describe('Estado de una invitación.') satisfies z.ZodType<InvitationStatus>;

export const InvitationSummarySchema = z
  .object({
    id: IdSchema,
    email: EmailFieldSchema,
    groupIds: z.array(IdSchema).max(IdentityLimits.maxGroupsPerMember),
    status: InvitationStatusSchema,
    expiresAt: TimestampSchema,
    invitedBy: IdSchema,
  })
  .describe('Invitación a un tenant.') satisfies z.ZodType<InvitationSummary>;

export const InvitationPageSchema = pageOf(
  InvitationSummarySchema,
  'Página de invitaciones.',
) satisfies z.ZodType<InvitationPage>;

export const InviteUserRequestSchema = z
  .strictObject({
    email: EmailFieldSchema,
    groupIds: z.array(IdSchema).max(IdentityLimits.maxGroupsPerMember),
  })
  .describe(
    'Invitación de un email a los grupos indicados.',
  ) satisfies z.ZodType<InviteUserRequest>;

export const RevokeInvitationRequestSchema = z
  .strictObject({ invitationId: IdSchema })
  .describe(
    'Invitación pendiente a revocar.',
  ) satisfies z.ZodType<RevokeInvitationRequest>;

export const AcceptInvitationRequestSchema = z
  .strictObject({ token: ActionTokenFieldSchema })
  .describe(
    'Aceptación de una invitación con el token del correo.',
  ) satisfies z.ZodType<AcceptInvitationRequest>;
