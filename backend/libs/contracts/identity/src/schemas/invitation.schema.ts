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
  .describe('Status of an invitation.') satisfies z.ZodType<InvitationStatus>;

export const InvitationSummarySchema = z
  .object({
    id: IdSchema,
    email: EmailFieldSchema,
    groupIds: z.array(IdSchema).max(IdentityLimits.maxGroupsPerMember),
    status: InvitationStatusSchema,
    expiresAt: TimestampSchema,
    invitedBy: IdSchema,
  })
  .describe('Invitation to a tenant.') satisfies z.ZodType<InvitationSummary>;

export const InvitationPageSchema = pageOf(
  InvitationSummarySchema,
  'Page of invitations.',
) satisfies z.ZodType<InvitationPage>;

export const InviteUserRequestSchema = z
  .strictObject({
    email: EmailFieldSchema,
    groupIds: z.array(IdSchema).max(IdentityLimits.maxGroupsPerMember),
  })
  .describe(
    'Invitation of an email to the given groups.',
  ) satisfies z.ZodType<InviteUserRequest>;

export const RevokeInvitationRequestSchema = z
  .strictObject({ invitationId: IdSchema })
  .describe(
    'Pending invitation to revoke.',
  ) satisfies z.ZodType<RevokeInvitationRequest>;

export const AcceptInvitationRequestSchema = z
  .strictObject({ token: ActionTokenFieldSchema })
  .describe(
    'Acceptance of an invitation with the emailed token.',
  ) satisfies z.ZodType<AcceptInvitationRequest>;
