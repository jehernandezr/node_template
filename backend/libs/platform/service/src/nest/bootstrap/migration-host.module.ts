import { Module, type DynamicModule } from '@nestjs/common';
import {
  DirectoryShardLister,
  TypeOrmDirectoryStore,
} from '@platform/adapters-postgres';
import { PostgresPlatformModule } from '@platform/adapters-postgres/nest';
import type { ConfigEnv } from '@platform/config';
import { ConfigModule } from '@platform/config/nest';
import type { TelemetryHandle } from '@platform/observability';
import { ObservabilityModule } from '@platform/observability/nest';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardingModule } from '@platform/sharding/nest';
import type { ServiceDefinition } from '../../service-definition.js';
import { ServiceDatabaseSets } from '../../service-database-sets.js';
import { KernelModule } from '@platform/kernel/nest';

/**
 * Root module of the migrator. It only sets up the databases: there is no Valkey, AWS, messaging or jobs, because
 * migrating must not depend on anything other than PostgreSQL. `KernelModule` is required
 * because `PostgresPlatformModule` injects `Clock` and `IdGenerator`.
 */
@Module({})
export class MigrationHostModule {
  /**
   * Composes the minimal module that runs the migrations of a service.
   * @param definition Service definition.
   * @param env Environment variables.
   * @param telemetry Telemetry handle, disabled for the migrator.
   * @returns The module.
   */
  static forService(
    definition: ServiceDefinition,
    env: ConfigEnv,
    telemetry: TelemetryHandle,
  ): DynamicModule {
    return {
      module: MigrationHostModule,
      imports: [
        KernelModule,
        ConfigModule.forRoot({ schema: definition.configSchema, env }),
        ObservabilityModule.forRoot({ telemetry }),
        PersistenceModule.forRoot({
          ...new ServiceDatabaseSets().merge(definition.migrations),
          shardLister: DirectoryShardLister,
        }),
        PostgresPlatformModule.forRoot(),
        ShardingModule.forRoot({ directory: TypeOrmDirectoryStore }),
      ],
    };
  }
}
