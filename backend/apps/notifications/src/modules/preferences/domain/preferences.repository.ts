import type { UserRef } from '@contracts/platform';
import type { NotificationPreferences } from './notification-preferences.js';

/** Preferencias del usuario del `ShardScope` abierto. */
export abstract class PreferencesRepository {
  abstract find(userId: string): Promise<NotificationPreferences | undefined>;

  /** La fila guarda el tenant de origen de `owner` para trasladarse con él. */
  abstract save(
    owner: UserRef,
    preferences: NotificationPreferences,
  ): Promise<void>;

  abstract erase(userId: string): Promise<number>;
}
