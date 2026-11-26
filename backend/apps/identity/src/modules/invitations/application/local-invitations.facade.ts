import { Injectable } from '@nestjs/common';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { InvitationPreview } from '../domain/invitation-preview.js';
import { AcceptInvitation } from './accept-invitation.use-case.js';
import { InvitationsFacade } from './invitations.facade.js';

/** Lets the registration of a new user preview, check and accept an invitation through `AcceptInvitation`. */
@Injectable()
export class LocalInvitationsFacade extends InvitationsFacade {
  constructor(private readonly accept: AcceptInvitation) {
    super();
  }

  override preview(token: string): Promise<InvitationPreview | undefined> {
    return this.accept.preview(token);
  }

  override acceptForNewUser(token: string, user: UserRef): Promise<void> {
    return this.accept.forNewUser(token, user);
  }

  override assertRoomForNewUser(invitation: InvitationPreview): Promise<void> {
    return this.accept.assertRoomForNewUser(invitation.tenantId);
  }
}
