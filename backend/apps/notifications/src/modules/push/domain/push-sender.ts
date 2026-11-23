import type { PushTarget } from '@contracts/identity';
import type { PushMessage } from './push-message.js';

/** Proveedor de push de una plataforma (APNs, FCM, Web Push). */
export abstract class PushSender {
  /** Devuelve el id que el proveedor asigna al envío. */
  abstract send(target: PushTarget, message: PushMessage): Promise<string>;
}
