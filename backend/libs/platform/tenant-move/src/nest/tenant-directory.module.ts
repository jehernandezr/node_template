import { Module, type DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@platform/config/nest';
import { ShardDataSources } from '@platform/persistence';
import {
  DirectoryStore,
  DirectoryWriter,
  ShardRouter,
} from '@platform/sharding';
import {
  TenantMoveConfig,
  type TenantMoveSettings,
} from '../config/tenant-move.config.js';
import { ManifestTenantDataPresence } from '../directory/manifest-tenant-data-presence.js';
import { TenantDataPresence } from '../directory/tenant-data-presence.js';
import { TenantDirectoryEntries } from '../directory/tenant-directory-entries.js';
import { TenantShardGroups } from '../directory/tenant-shard-groups.js';
import { TenantMoveTargets } from '../targets/tenant-move-targets.js';
import type { TenantDirectoryFeatureOptions } from './tenant-directory-feature-options.js';
import { TenantDirectoryOperationsFactory } from './tenant-directory-operations.factory.js';

/**
 * Registers the operations identity uses to place a tenant in a service's shard directory. Requires
 * the platform sharding (`ShardRouter`, `DirectoryStore` and `DirectoryWriter`) and `ShardDataSources` in the context,
 * which the `@platform/service` runtime mounts as globals.
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
          provide: TenantDataPresence,
          useFactory: (directory: DirectoryStore, sources: ShardDataSources) =>
            new ManifestTenantDataPresence(
              new options.manifest(),
              directory,
              sources,
            ),
          inject: [DirectoryStore, ShardDataSources],
        },
        {
          provide: TenantDirectoryEntries,
          useFactory: (
            writer: DirectoryWriter,
            directory: DirectoryStore,
            router: ShardRouter,
            groups: TenantShardGroups,
            presence: TenantDataPresence,
          ) =>
            new TenantDirectoryEntries(
              writer,
              directory,
              router,
              groups,
              presence,
            ),
          inject: [
            DirectoryWriter,
            DirectoryStore,
            ShardRouter,
            TenantShardGroups,
            TenantDataPresence,
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
