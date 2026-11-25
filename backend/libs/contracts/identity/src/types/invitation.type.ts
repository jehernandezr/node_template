import type { Page } from '@contracts/platform';
import type { InvitationStatus } from '../enums/tenant.enum.js';

/** Pending, accepted, revoked or expired invitation. */
export interface InvitationSummary {
  id: string;
  email: string;
  groupIds: string[];
  status: InvitationStatus;
  /** ISO 8601 instant at which the invitation expires. */
  expiresAt: string;
  invitedBy: string;
}

export type InvitationPage = Page<InvitationSummary>;

/** Invitation of an email to the given groups. */
export interface InviteUserRequest {
  email: string;
  groupIds: string[];
}

/** Revocation of a pending invitation. */
export interface RevokeInvitationRequest {
  invitationId: string;
}

/** Acceptance of the invitation with the token sent by email. */
export interface AcceptInvitationRequest {
  token: string;
}
