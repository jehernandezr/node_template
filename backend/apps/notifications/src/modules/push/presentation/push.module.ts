import { Module } from '@nestjs/common';
import { NotificationsSettings } from '../../../config/notifications-settings.js';
import { DeliverPush } from '../application/deliver-push.use-case.js';
import { PushFacade } from '../application/push.facade.js';
import { PushSender } from '../domain/push-sender.js';
import { PushTargetDirectory } from '../domain/push-target-directory.js';
import { IdentityPushTargetDirectory } from '../infrastructure/identity-push-target-directory.js';
import { PushSenderSelector } from '../infrastructure/push-sender-selector.js';

/**
 * Push to the user's devices through the sender of `NOTIFICATIONS_PUSH_SENDER`, `memory` or `none`: the real providers
 * require their own accounts and come in as another `PushSender` without changing the rest.
 */
@Module({
  providers: [
    NotificationsSettings,
    {
      provide: PushSender,
      useFactory: (settings: NotificationsSettings) =>
        new PushSenderSelector().select(settings.values),
      inject: [NotificationsSettings],
    },
    { provide: PushTargetDirectory, useClass: IdentityPushTargetDirectory },
    DeliverPush,
    { provide: PushFacade, useExisting: DeliverPush },
  ],
  exports: [PushFacade],
})
export class PushModule {}
