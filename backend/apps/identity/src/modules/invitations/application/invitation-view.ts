import type { InvitationSummary } from '@contracts/identity';
import type { Invitation } from '../domain/invitation.js';

/** The invitation that the contract returns. */
export class InvitationView {
  /**
   * Builds the API view of an invitation with its status at `now`.
   * @param invitation Stored invitation.
   * @param now Current instant.
   * @returns Its summary.
   */
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
