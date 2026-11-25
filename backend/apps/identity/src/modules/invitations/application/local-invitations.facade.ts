import { Injectable } from '@nestjs/common';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { InvitationPreview } from '../domain/invitation-preview.js';
import { AcceptInvitation } from './accept-invitation.use-case.js';
import { InvitationsFacade } from './invitations.facade.js';

/** In-process `InvitationsFacade`. */
@Injectable()
export class LocalInvitationsFacade extends InvitationsFacade {
  constructor(private readonly accept: AcceptInvitation) {
    super();
  }

  preview(token: string): Promise<InvitationPreview | undefined> {
    return this.accept.preview(token);
  }

  acceptForNewUser(token: string, user: UserRef): Promise<void> {
    return this.accept.forNewUser(token, user);
  }

  assertRoomForNewUser(invitation: InvitationPreview): Promise<void> {
    return this.accept.assertRoomForNewUser(invitation.tenantId);
  }
}
