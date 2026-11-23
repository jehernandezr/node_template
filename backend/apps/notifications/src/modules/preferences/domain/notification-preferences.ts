import type {
  NotificationChannel,
  NotificationPreferences as PreferencesView,
  NotificationType,
} from '@contracts/notifications';
import { InvalidQuietHoursError } from './preferences.error.js';
import { QuietHours } from './quiet-hours.js';

/**
 * Por qué canales quiere el usuario cada tipo de notificación y cuándo no quiere que lo molesten. Un tipo
 * que el usuario nunca configuró sale por todos los canales.
 */
export class NotificationPreferences {
  private constructor(
    private readonly view: PreferencesView,
    readonly quietHours: QuietHours,
  ) {}

  /** @throws InvalidQuietHoursError si las horas o la zona no son válidas. */
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

  /** Los canales que el usuario eligió para el tipo, o `undefined` si no lo configuró. */
  channelsFor(
    type: NotificationType,
  ): readonly NotificationChannel[] | undefined {
    return this.view.enabled.find((entry) => entry.type === type)?.channels;
  }

  toView(): PreferencesView {
    return this.view;
  }
}
