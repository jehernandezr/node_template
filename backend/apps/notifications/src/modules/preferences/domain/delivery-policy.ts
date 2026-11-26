import {
  NotificationChannel,
  NotificationPolicy,
  type NotificationType,
} from '@contracts/notifications';
import type { NotificationPreferences } from './notification-preferences.js';

/** What the policy needs to know about the moment of delivery. */
export interface DeliveryContext {
  readonly type: NotificationType;
  readonly preferences: NotificationPreferences;
  readonly now: Date;
  /** The user has an open real-time connection. */
  readonly online: boolean;
}

/**
 * Chooses the channels of a notification. Mandatory types (security alerts) go out through all of them and
 * ignore both preferences and schedule. The rest go out through the channels the user chose; during their quiet
 * hours only the inbox remains, and with an open connection push is redundant because the inbox already reaches them.
 * The inbox is always there: it is the record of what the user was notified about.
 */
export class DeliveryPolicy {
  private static readonly ALL: readonly NotificationChannel[] =
    Object.values(NotificationChannel);

  /**
   * Decides the channels of one notification from its type, the preferences, the quiet hours and whether the user is online.
   * @param context Type, preferences, instant and presence.
   * @returns The channels to use.
   */
  channels(context: DeliveryContext): readonly NotificationChannel[] {
    if (
      (
        NotificationPolicy.mandatoryTypes as readonly NotificationType[]
      ).includes(context.type)
    ) {
      return DeliveryPolicy.ALL;
    }
    if (context.preferences.quietHours.contains(context.now)) {
      return [NotificationChannel.InApp];
    }
    const chosen = new Set(
      context.preferences.channelsFor(context.type) ?? DeliveryPolicy.ALL,
    );
    chosen.add(NotificationChannel.InApp);
    if (context.online) {
      chosen.delete(NotificationChannel.Push);
    }
    return DeliveryPolicy.ALL.filter((channel) => chosen.has(channel));
  }
}
