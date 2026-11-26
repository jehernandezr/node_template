import type { PushTarget } from '@contracts/identity';
import type { PushMessage } from '../domain/push-message.js';
import { PushSender } from '../domain/push-sender.js';

/** A push sent in memory mode. */
export interface SentPush {
  readonly target: PushTarget;
  readonly message: PushMessage;
}

/** Provider-less mode: APNs, FCM and Web Push require accounts of the template's user. Stores what was sent. */
export class InMemoryPushSender extends PushSender {
  readonly sent: SentPush[] = [];

  override async send(
    target: PushTarget,
    message: PushMessage,
  ): Promise<string> {
    this.sent.push({ target, message });
    return `memory-push-${this.sent.length}`;
  }
}
