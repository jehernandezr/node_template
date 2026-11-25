import { Global, Module } from '@nestjs/common';
import { DeliverPush } from '../application/deliver-push.use-case.js';
import { PushFacade } from '../application/push.facade.js';
import { PushSender } from '../domain/push-sender.js';
import { PushTargetDirectory } from '../domain/push-target-directory.js';
import { IdentityPushTargetDirectory } from '../infrastructure/identity-push-target-directory.js';
import { InMemoryPushSender } from '../infrastructure/in-memory-push-sender.js';

/**
 * Push to the user's devices. `NOTIFICATIONS_PUSH_SENDER` only accepts memory: the real providers
 * require their own accounts and come in as another `PushSender` without changing the rest.
 */
@Global()
@Module({
  providers: [
    { provide: PushSender, useValue: new InMemoryPushSender() },
    { provide: PushTargetDirectory, useClass: IdentityPushTargetDirectory },
    DeliverPush,
    { provide: PushFacade, useExisting: DeliverPush },
  ],
  exports: [PushFacade],
})
export class PushModule {}
