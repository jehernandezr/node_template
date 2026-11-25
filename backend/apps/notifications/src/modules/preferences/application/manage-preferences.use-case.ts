import { Injectable } from '@nestjs/common';
import type { NotificationPreferences as PreferencesView } from '@contracts/notifications';
import type { UserRef } from '@contracts/platform';
import { NotificationsDefaults } from '../../../shared/constants/notifications-defaults.constants.js';
import { UserShard } from '../../../shared/utils/user-shard.js';
import { NotificationPreferences } from '../domain/notification-preferences.js';
import { PreferencesRepository } from '../domain/preferences.repository.js';
import { PreferencesFacade } from './preferences.facade.js';

/** Reads and saves the user's preferences in their shard. */
@Injectable()
export class ManagePreferences extends PreferencesFacade {
  private static readonly DEFAULTS: PreferencesView = {
    enabled: [],
    quietStart: NotificationsDefaults.quietStart,
    quietEnd: NotificationsDefaults.quietEnd,
    timezone: NotificationsDefaults.timezone,
  };

  constructor(
    private readonly preferences: PreferencesRepository,
    private readonly shard: UserShard,
  ) {
    super();
  }

  async get(user: UserRef): Promise<NotificationPreferences> {
    const saved = await this.shard.run(user, () =>
      this.preferences.find(user.userId),
    );
    return saved ?? NotificationPreferences.of(ManagePreferences.DEFAULTS);
  }

  /** @throws InvalidQuietHoursError if the schedule is not valid; saves nothing. */
  async save(user: UserRef, view: PreferencesView): Promise<void> {
    const preferences = NotificationPreferences.of(view);
    await this.shard.run(user, () => this.preferences.save(user, preferences));
  }

  erase(user: UserRef): Promise<number> {
    return this.shard.run(user, () => this.preferences.erase(user.userId));
  }
}
