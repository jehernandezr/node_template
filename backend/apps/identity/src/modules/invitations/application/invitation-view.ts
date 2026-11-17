import type { InvitationSummary } from '@contracts/identity';
import type { Invitation } from '../domain/invitation.js';

/** La invitación que responde el contrato. */
export class InvitationView {
  static of(invitation: Invitation, now: Date): InvitationSummary {
    const state = invitation.snapshot();
    return {
      id: state.id,
      email: state.email,
      groupIds: [...state.groupIds],
      status: invitation.statusAt(now),
      expiresAt: state.expiresAt.toISOString(),
      invitedBy: state.invitedBy,
    };
  }
}
