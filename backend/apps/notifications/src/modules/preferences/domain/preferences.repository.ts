import type { UserRef } from '@contracts/platform';
import type { NotificationPreferences } from './notification-preferences.js';

/** Preferences of the user of the open `ShardScope`. */
export abstract class PreferencesRepository {
  abstract find(userId: string): Promise<NotificationPreferences | undefined>;

  /** The row stores the home tenant of `owner` so it moves with it. */
  abstract save(
    owner: UserRef,
    preferences: NotificationPreferences,
  ): Promise<void>;

  abstract erase(userId: string): Promise<number>;
}
