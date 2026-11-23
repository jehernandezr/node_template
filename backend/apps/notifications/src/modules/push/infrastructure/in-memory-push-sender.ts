import type { PushTarget } from '@contracts/identity';
import type { PushMessage } from '../domain/push-message.js';
import { PushSender } from '../domain/push-sender.js';

/** Un push enviado en modo memoria. */
export interface SentPush {
  readonly target: PushTarget;
  readonly message: PushMessage;
}

/** Modo sin proveedor: APNs, FCM y Web Push piden cuentas del usuario de la plantilla. Guarda lo enviado. */
export class InMemoryPushSender extends PushSender {
  readonly sent: SentPush[] = [];

  async send(target: PushTarget, message: PushMessage): Promise<string> {
    this.sent.push({ target, message });
    return `memory-push-${this.sent.length}`;
  }
}
