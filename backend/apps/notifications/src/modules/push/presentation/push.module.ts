import { Global, Module } from '@nestjs/common';
import { DeliverPush } from '../application/deliver-push.use-case.js';
import { PushFacade } from '../application/push.facade.js';
import { PushSender } from '../domain/push-sender.js';
import { PushTargetDirectory } from '../domain/push-target-directory.js';
import { IdentityPushTargetDirectory } from '../infrastructure/identity-push-target-directory.js';
import { InMemoryPushSender } from '../infrastructure/in-memory-push-sender.js';

/**
 * Push a los dispositivos del usuario. `NOTIFICATIONS_PUSH_SENDER` solo admite memoria: los proveedores reales
 * piden cuentas propias y entran como otro `PushSender` sin cambiar el resto.
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
