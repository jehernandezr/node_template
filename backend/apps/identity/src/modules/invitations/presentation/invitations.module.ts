import { Global, Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { AcceptInvitation } from '../application/accept-invitation.use-case.js';
import { InvitationsFacade } from '../application/invitations.facade.js';
import { InviteUser } from '../application/invite-user.use-case.js';
import { LocalInvitationsFacade } from '../application/local-invitations.facade.js';
import { ManageInvitations } from '../application/manage-invitations.use-case.js';
import { InvitationRepository } from '../domain/invitation.repository.js';
import { InvitationEntity } from '../infrastructure/persistence/entities/invitation.entity.js';
import { TypeOrmInvitationRepository } from '../infrastructure/persistence/typeorm-invitation.repository.js';
import { InvitationsController } from './invitations.controller.js';

/** Invitations to a tenant. Global only for its facade. */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [InvitationEntity],
      sharding: { key: ShardKey.Tenant },
    }),
  ],
  controllers: [InvitationsController],
  providers: [
    { provide: InvitationRepository, useClass: TypeOrmInvitationRepository },
    InviteUser,
    ManageInvitations,
    AcceptInvitation,
    { provide: InvitationsFacade, useClass: LocalInvitationsFacade },
  ],
  exports: [InvitationsFacade],
})
export class InvitationsModule {}
