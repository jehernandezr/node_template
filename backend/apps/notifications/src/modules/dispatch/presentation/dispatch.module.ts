import { Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { ChannelDeliverer } from '../application/channel-deliverer.js';
import { DispatchFacade } from '../application/dispatch.facade.js';
import { EraseUserDeliveries } from '../application/erase-user-deliveries.use-case.js';
import { LocalDispatchFacade } from '../application/local-dispatch.facade.js';
import { NotifyUser } from '../application/notify-user.use-case.js';
import { RetryDeliveriesJob } from '../application/retry-deliveries.job.js';
import { DeliveryRepository } from '../domain/delivery.repository.js';
import { FailedDeliveries } from '../domain/failed-deliveries.js';
import { RecipientDirectory } from '../domain/recipient-directory.js';
import { IdentityRecipientDirectory } from '../infrastructure/identity-recipient-directory.js';
import { DeliveryEntity } from '../infrastructure/persistence/entities/delivery.entity.js';
import { TypeOrmDeliveryRepository } from '../infrastructure/persistence/typeorm-delivery.repository.js';
import { TypeOrmFailedDeliveries } from '../infrastructure/persistence/typeorm-failed-deliveries.js';
import { DispatchInternalOperations } from './dispatch.internal-operations.js';
import { EmailModule } from '../../email/module.js';
import { InboxModule } from '../../inbox/module.js';
import { PreferencesModule } from '../../preferences/module.js';
import { PushModule } from '../../push/module.js';
import { NotificationsRealtimeModule } from '../../realtime/module.js';

/** Single entry point for notifications: channels, texts, deliveries and their retries. */
@Module({
  imports: [
    EmailModule,
    InboxModule,
    PreferencesModule,
    PushModule,
    NotificationsRealtimeModule,
    PersistenceModule.forFeature({
      entities: [DeliveryEntity],
      sharding: { key: ShardKey.User },
    }),
  ],
  providers: [
    { provide: RecipientDirectory, useClass: IdentityRecipientDirectory },
    { provide: DeliveryRepository, useClass: TypeOrmDeliveryRepository },
    { provide: FailedDeliveries, useClass: TypeOrmFailedDeliveries },
    ChannelDeliverer,
    NotifyUser,
    EraseUserDeliveries,
    { provide: DispatchFacade, useClass: LocalDispatchFacade },
    RetryDeliveriesJob,
    DispatchInternalOperations,
  ],
  exports: [DispatchFacade, RecipientDirectory],
})
export class DispatchModule {}
