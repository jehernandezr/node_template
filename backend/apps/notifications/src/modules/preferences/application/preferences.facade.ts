import type { UserRef } from '@contracts/platform';
import type { NotificationPreferences } from '../domain/notification-preferences.js';

/** What the other notifications modules ask of the preferences. */
export abstract class PreferencesFacade {
  /** The saved ones or, if the user never saved any, the defaults. */
  abstract get(user: UserRef): Promise<NotificationPreferences>;

  abstract erase(user: UserRef): Promise<number>;
}
