import type {
  NotificationChannel,
  NotificationPreferences as PreferencesView,
  NotificationType,
} from '@contracts/notifications';
import { InvalidQuietHoursError } from './preferences.error.js';
import { QuietHours } from './quiet-hours.js';

/**
 * Which channels the user wants for each notification type and when they do not want to be disturbed. A type
 * the user never configured goes out through all channels.
 */
export class NotificationPreferences {
  private constructor(
    private readonly view: PreferencesView,
    readonly quietHours: QuietHours,
  ) {}

  /** @throws InvalidQuietHoursError if the hours or the zone are not valid. */
  static of(view: PreferencesView): NotificationPreferences {
    const quietHours = QuietHours.parse(
      view.quietStart,
      view.quietEnd,
      view.timezone,
    );
    if (quietHours === undefined) {
      throw new InvalidQuietHoursError();
    }
    return new NotificationPreferences(view, quietHours);
  }

  /** The channels the user chose for the type, or `undefined` if they did not configure it. */
  channelsFor(
    type: NotificationType,
  ): readonly NotificationChannel[] | undefined {
    return this.view.enabled.find((entry) => entry.type === type)?.channels;
  }

  toView(): PreferencesView {
    return this.view;
  }
}
