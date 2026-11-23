import { Injectable } from '@nestjs/common';
import type {
  NotificationChannel,
  NotificationType,
} from '@contracts/notifications';
import { IdGenerator } from '@platform/kernel';
import { ManagerIntent, RepositoryKit } from '@platform/persistence';
import { NotificationPreferences } from '../../domain/notification-preferences.js';
import { PreferencesRepository } from '../../domain/preferences.repository.js';
import { NotificationPreferencesEntity } from './entities/notification-preferences.entity.js';

/** `PreferencesRepository` sobre `notification_preferences` del shard del usuario. */
@Injectable()
export class TypeOrmPreferencesRepository extends PreferencesRepository {
  constructor(
    private readonly kit: RepositoryKit,
    private readonly ids: IdGenerator,
  ) {
    super();
  }

  async find(userId: string): Promise<NotificationPreferences | undefined> {
    const row = await this.kit.provider.run(
      { feature: this.kit.feature, intent: ManagerIntent.Read },
      (manager) => manager.findOneBy(NotificationPreferencesEntity, { userId }),
    );
    return row === null
      ? undefined
      : NotificationPreferences.of({
          enabled: row.enabled.map((entry) => ({
            type: entry.type as NotificationType,
            channels: entry.channels as NotificationChannel[],
          })),
          quietStart: row.quietStart,
          quietEnd: row.quietEnd,
          timezone: row.timezone,
        });
  }

  /** Reemplaza la fila entera: guardar las mismas preferencias dos veces deja una sola fila igual. */
  async save(
    userId: string,
    preferences: NotificationPreferences,
  ): Promise<void> {
    const view = preferences.toView();
    await this.kit.provider.run(
      { feature: this.kit.feature, intent: ManagerIntent.Write },
      (manager) =>
        manager
          .createQueryBuilder()
          .insert()
          .into(NotificationPreferencesEntity)
          .values({
            id: this.ids.next().toString(),
            userId,
            enabled: view.enabled,
            quietStart: view.quietStart,
            quietEnd: view.quietEnd,
            timezone: view.timezone,
          })
          .orUpdate(
            ['enabled', 'quiet_start', 'quiet_end', 'timezone'],
            ['user_id'],
          )
          .execute(),
    );
  }

  async erase(userId: string): Promise<number> {
    const result = await this.kit.provider.run(
      { feature: this.kit.feature, intent: ManagerIntent.Write },
      (manager) => manager.delete(NotificationPreferencesEntity, { userId }),
    );
    return result.affected ?? 0;
  }
}
