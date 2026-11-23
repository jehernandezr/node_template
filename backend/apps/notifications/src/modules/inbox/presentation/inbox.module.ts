import { Global, Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { UserShard } from '../../../shared/utils/user-shard.js';
import { InboxFacade } from '../application/inbox.facade.js';
import { ManageInbox } from '../application/manage-inbox.use-case.js';
import { PurgeReadNotificationsJob } from '../application/purge-read-notifications.job.js';
import { InboxMaintenance } from '../domain/inbox-maintenance.js';
import { InboxRepository } from '../domain/inbox.repository.js';
import { NotificationEntity } from '../infrastructure/persistence/entities/notification.entity.js';
import { TypeOrmInboxMaintenance } from '../infrastructure/persistence/typeorm-inbox-maintenance.js';
import { TypeOrmInboxRepository } from '../infrastructure/persistence/typeorm-inbox.repository.js';
import { InboxController } from './inbox.controller.js';

/** Bandeja de notificaciones por usuario. Global solo para su fachada. */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [NotificationEntity],
      sharding: { key: ShardKey.User },
    }),
  ],
  controllers: [InboxController],
  providers: [
    UserShard,
    { provide: InboxRepository, useClass: TypeOrmInboxRepository },
    { provide: InboxMaintenance, useClass: TypeOrmInboxMaintenance },
    ManageInbox,
    { provide: InboxFacade, useExisting: ManageInbox },
    PurgeReadNotificationsJob,
  ],
  exports: [InboxFacade],
})
export class InboxModule {}
