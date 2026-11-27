import { PushSender } from '../domain/push-sender.js';

/**
 * Sender of the environments without a push provider (`NOTIFICATIONS_PUSH_SENDER=none`): it delivers nothing, so each
 * push is recorded as skipped while the notification still reaches the inbox and email.
 */
export class NonePushSender extends PushSender {
  override async send(): Promise<undefined> {
    return undefined;
  }
}
