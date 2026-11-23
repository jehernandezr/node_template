import type { NotificationPreferences } from './notification-preferences.js';

/** Preferencias del usuario del `ShardScope` abierto. */
export abstract class PreferencesRepository {
  abstract find(userId: string): Promise<NotificationPreferences | undefined>;

  abstract save(
    userId: string,
    preferences: NotificationPreferences,
  ): Promise<void>;

  abstract erase(userId: string): Promise<number>;
}
