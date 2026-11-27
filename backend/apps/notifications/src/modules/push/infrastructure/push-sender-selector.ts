import type { NotificationsConfig } from '../../../config/notifications.config.js';
import { PushSenderKind } from '../../../shared/enums/push-sender-kind.enum.js';
import type { PushSender } from '../domain/push-sender.js';
import { InMemoryPushSender } from './in-memory-push-sender.js';
import { NonePushSender } from './none-push-sender.js';

/** Builds the `PushSender` that `NOTIFICATIONS_PUSH_SENDER` asks for. */
export class PushSenderSelector {
  /**
   * The sender of the configured kind.
   * @param settings Push sender kind from the configuration.
   * @returns The push sender to inject.
   */
  select(
    settings: Pick<NotificationsConfig, 'NOTIFICATIONS_PUSH_SENDER'>,
  ): PushSender {
    switch (settings.NOTIFICATIONS_PUSH_SENDER) {
      case PushSenderKind.Memory:
        return new InMemoryPushSender();
      case PushSenderKind.None:
        return new NonePushSender();
    }
  }
}
