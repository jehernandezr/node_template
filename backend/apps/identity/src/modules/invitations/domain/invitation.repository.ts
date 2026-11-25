import type { Invitation } from './invitation.js';

/** Invitations in the tenant's shard. */
export abstract class InvitationRepository {
  abstract insert(invitation: Invitation): Promise<void>;
  abstract find(invitationId: string): Promise<Invitation | undefined>;
  abstract findByTokenHash(tokenHash: string): Promise<Invitation | undefined>;
  abstract list(): Promise<readonly Invitation[]>;
  abstract update(invitation: Invitation): Promise<void>;
}
