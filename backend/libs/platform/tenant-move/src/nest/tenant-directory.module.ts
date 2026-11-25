import { Module, type DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@platform/config/nest';
import {
  DirectoryStore,
  DirectoryWriter,
  ShardRouter,
} from '@platform/sharding';
import {
  TenantMoveConfig,
  type TenantMoveSettings,
} from '../config/tenant-move.config.js';
import { TenantDirectoryEntries } from '../directory/tenant-directory-entries.js';
import { TenantShardGroups } from '../directory/tenant-shard-groups.js';
import { TenantMoveTargets } from '../targets/tenant-move-targets.js';
import type { TenantDirectoryFeatureOptions } from './tenant-directory-feature-options.js';
import { TenantDirectoryOperationsFactory } from './tenant-directory-operations.factory.js';

/**
 * Registra las operaciones con las que identity ubica un tenant en el directorio de shards de un servicio. Requiere
 * en el contexto el sharding de la plataforma (`ShardRouter`, `DirectoryStore` y `DirectoryWriter`), que el runtime de
 * `@platform/service` monta como global.
 */
@Module({})
export class TenantDirectoryModule {
  static forFeature(options: TenantDirectoryFeatureOptions): DynamicModule {
    const operations = TenantDirectoryOperationsFactory.create(
      options.operations,
    );
    return {
      module: TenantDirectoryModule,
      imports: [ConfigModule.forFeature(TenantMoveConfig)],
      providers: [
        {
          provide: TenantShardGroups,
          useFactory: (settings: TenantMoveSettings) =>
            new TenantShardGroups(
              options.service,
              new TenantMoveTargets(settings.TENANT_MOVE_TARGETS),
            ),
          inject: [TenantMoveConfig.token],
        },
        {
          provide: TenantDirectoryEntries,
          useFactory: (
            writer: DirectoryWriter,
            directory: DirectoryStore,
            router: ShardRouter,
            groups: TenantShardGroups,
          ) => new TenantDirectoryEntries(writer, directory, router, groups),
          inject: [
            DirectoryWriter,
            DirectoryStore,
            ShardRouter,
            TenantShardGroups,
          ],
        },
        {
          provide: operations,
          useFactory: (entries: TenantDirectoryEntries) =>
            new operations(entries),
          inject: [TenantDirectoryEntries],
        },
      ],
    };
  }
}
