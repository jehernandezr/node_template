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
import { PlatformKernelModule } from '../runtime/platform-kernel.module.js';

/**
 * Módulo raíz del migrador. Solo arma las bases: no hay Valkey, AWS, mensajería ni jobs, porque
 * migrar no debe depender de nada que no sea PostgreSQL. `PlatformKernelModule` es obligatorio
 * porque `PostgresPlatformModule` inyecta `Clock` e `IdGenerator`.
 */
@Module({})
export class MigrationHostModule {
  static forService(
    definition: ServiceDefinition,
    env: ConfigEnv,
    telemetry: TelemetryHandle,
  ): DynamicModule {
    return {
      module: MigrationHostModule,
      imports: [
        PlatformKernelModule,
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
