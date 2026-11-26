import type { UserRef } from '@contracts/platform';
import type { NotificationPreferences } from './notification-preferences.js';

/** Preferences of the user of the open `ShardScope`. */
export abstract class PreferencesRepository {
  /**
   * Reads the preferences of a user.
   * @param userId Owner of the preferences.
   * @returns The preferences, or `undefined` when never saved.
   */
  abstract find(userId: string): Promise<NotificationPreferences | undefined>;

  /**
   * Saves the preferences of a user.
   * The row stores the home tenant of `owner` so it moves with it.
   * @param owner Owner of the preferences.
   * @param preferences Preferences to save.
   */
  abstract save(
    owner: UserRef,
    preferences: NotificationPreferences,
  ): Promise<void>;

  /**
   * Deletes the preferences of a user.
   * @param userId User to erase.
   * @returns How many rows were deleted.
   */
  abstract erase(userId: string): Promise<number>;
}
