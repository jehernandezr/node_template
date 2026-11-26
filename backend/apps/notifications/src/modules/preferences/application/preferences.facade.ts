import type { UserRef } from '@contracts/platform';
import type { NotificationPreferences } from '../domain/notification-preferences.js';

/** What the other notifications modules ask of the preferences. */
export abstract class PreferencesFacade {
  /**
   * The saved ones or, if the user never saved any, the defaults.
   * @param user Owner of the preferences.
   * @returns The preferences.
   */
  abstract get(user: UserRef): Promise<NotificationPreferences>;

  /**
   * Deletes the preferences of a user.
   * @param user User to erase.
   * @returns How many rows were deleted.
   */
  abstract erase(user: UserRef): Promise<number>;
}
