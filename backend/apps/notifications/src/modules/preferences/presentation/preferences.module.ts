import { Global, Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { UserShard } from '../../../shared/utils/user-shard.js';
import { ManagePreferences } from '../application/manage-preferences.use-case.js';
import { PreferencesFacade } from '../application/preferences.facade.js';
import { PreferencesRepository } from '../domain/preferences.repository.js';
import { NotificationPreferencesEntity } from '../infrastructure/persistence/entities/notification-preferences.entity.js';
import { TypeOrmPreferencesRepository } from '../infrastructure/persistence/typeorm-preferences.repository.js';
import { PreferencesController } from './preferences.controller.js';

/** Per-user notification preferences. Global only for its facade. */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [NotificationPreferencesEntity],
      sharding: { key: ShardKey.User },
    }),
  ],
  controllers: [PreferencesController],
  providers: [
    UserShard,
    { provide: PreferencesRepository, useClass: TypeOrmPreferencesRepository },
    ManagePreferences,
    { provide: PreferencesFacade, useExisting: ManagePreferences },
  ],
  exports: [PreferencesFacade],
})
export class PreferencesModule {}
