import { Module, type DynamicModule } from '@nestjs/common';
import { RdsIamDatabaseTokenProvider } from '@platform/adapters-aws';
import { AwsModule } from '@platform/adapters-aws/nest';
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
import { DatabaseIamAuth } from '../runtime/database-iam-auth.js';
import { RuntimeAdapterSelector } from '../runtime/runtime-adapter-selector.js';

/**
 * Root module of the migrator. It only sets up the databases: there is no Valkey, messaging or jobs, because
 * migrating must not depend on anything other than PostgreSQL. With `DB_AUTH=iam` it adds the AWS adapter only to
 * sign the connection tokens of the owner role. `KernelModule` is required because `PostgresPlatformModule` and the
 * signer inject `Clock` and `IdGenerator`.
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
    const databaseIam = DatabaseIamAuth.required(
      definition.name,
      env,
      new RuntimeAdapterSelector().awsConfigured(env),
    );
    return {
      module: MigrationHostModule,
      imports: [
        KernelModule,
        ConfigModule.forRoot({ schema: definition.configSchema, env }),
        ObservabilityModule.forRoot({ telemetry }),
        ...(databaseIam ? [AwsModule.forRoot({ rdsIam: true })] : []),
        PersistenceModule.forRoot({
          ...new ServiceDatabaseSets().merge(definition.migrations),
          shardLister: DirectoryShardLister,
          ...(databaseIam ? { tokens: RdsIamDatabaseTokenProvider } : {}),
        }),
        PostgresPlatformModule.forRoot(),
        ShardingModule.forRoot({ directory: TypeOrmDirectoryStore }),
      ],
    };
  }
}
