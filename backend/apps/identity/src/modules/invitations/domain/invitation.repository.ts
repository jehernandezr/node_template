import type { Invitation } from './invitation.js';

/** Invitations in the tenant's shard. */
export abstract class InvitationRepository {
  /**
   * Stores a new invitation.
   * @param invitation Invitation to store.
   */
  abstract insert(invitation: Invitation): Promise<void>;
  /**
   * Reads an invitation of the tenant in scope.
   * @param invitationId Invitation to read.
   * @returns The invitation, or `undefined`.
   */
  abstract find(invitationId: string): Promise<Invitation | undefined>;
  /**
   * Reads an invitation by the hash of its token.
   * @param tokenHash Hash of the token.
   * @returns The invitation, or `undefined`.
   */
  abstract findByTokenHash(tokenHash: string): Promise<Invitation | undefined>;
  /**
   * Lists the invitations of the tenant in scope.
   * @returns The invitations.
   */
  abstract list(): Promise<readonly Invitation[]>;
  /**
   * Saves the changes of an invitation.
   * @param invitation Invitation read earlier and changed.
   */
  abstract update(invitation: Invitation): Promise<void>;
}
