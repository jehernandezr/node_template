import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { InvitationPreview } from '../domain/invitation-preview.js';

/** Lets registration preview an invitation, accept it for a new user and check that its tenant has room. */
export abstract class InvitationsFacade {
  /**
   * The token's valid invitation, or `undefined` if it does not exist, expired or was already used.
   * @param token Invitation token from the link.
   * @returns The invitation preview, or `undefined`.
   */
  abstract preview(token: string): Promise<InvitationPreview | undefined>;

  /**
   * Accepts the invitation for a newly registered user with the same email: adds the membership and marks
   * the invitation. The token arrived at that email, so it proves the user controls it.
   * @param token Invitation token from the link.
   * @param user New user with the invited email.
   */
  abstract acceptForNewUser(token: string, user: UserRef): Promise<void>;

  /**
   * Checks that the plan of the invitation's tenant allows one more user, before creating the account that
   * will accept it.
   * @param invitation Invitation to accept.
   * @throws QuotaExceededError `BILLING.QUOTA.EXCEEDED` if the plan no longer allows another user.
   * @throws BillingUnavailableError if billing does not respond.
   */
  abstract assertRoomForNewUser(invitation: InvitationPreview): Promise<void>;
}
