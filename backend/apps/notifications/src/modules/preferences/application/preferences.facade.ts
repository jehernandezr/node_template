import type { UserRef } from '@contracts/platform';
import type { NotificationPreferences } from '../domain/notification-preferences.js';

/** Lo que los otros módulos de notifications piden de las preferencias. */
export abstract class PreferencesFacade {
  /** Las guardadas o, si el usuario nunca guardó, las de por defecto. */
  abstract get(user: UserRef): Promise<NotificationPreferences>;

  abstract erase(user: UserRef): Promise<number>;
}
