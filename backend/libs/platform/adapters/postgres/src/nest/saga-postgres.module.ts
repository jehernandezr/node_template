import { Global, Module } from '@nestjs/common';
import { LoggerPort } from '@platform/observability';
import {
  AcrossShards,
  EntityManagerProvider,
  PersistenceContextProvider,
  PersistenceFeature,
  ShardScope,
} from '@platform/persistence';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { ShardedSagaScopes } from '../saga/sharded-saga-scopes.js';
import { platformSagaShardEntities } from '../saga/platform-saga-shard-entities.js';
import { SagaInstanceMapper } from '../saga/saga-instance.mapper.js';
import { SagaStepLogMapper } from '../saga/saga-step-log.mapper.js';
import { TypeOrmSagaStore } from '../saga/typeorm-saga-store.js';

/**
 * Almacén de sagas sobre Postgres para `SagaModule`: declara las tablas de la
 * bitácora en el shard del tenant y provee `TypeOrmSagaStore` y
 * `ShardedSagaScopes`. Es global, como `SagaModule`. Va antes de `SagaModule`:
 *
 * ```ts
 * imports: [
 *   SagaPostgresModule,
 *   SagaModule.forRoot({ store: TypeOrmSagaStore, scopes: ShardedSagaScopes }),
 * ]
 * ```
 */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [...platformSagaShardEntities],
      sharding: { key: ShardKey.Tenant },
    }),
  ],
  providers: [
    SagaInstanceMapper,
    SagaStepLogMapper,
    {
      provide: TypeOrmSagaStore,
      useFactory: (
        feature: PersistenceFeature,
        provider: EntityManagerProvider,
        context: PersistenceContextProvider,
        scope: ShardScope,
        acrossShards: AcrossShards,
        instances: SagaInstanceMapper,
        steps: SagaStepLogMapper,
        logger?: LoggerPort,
      ) =>
        new TypeOrmSagaStore({
          provider,
          feature,
          context,
          scope,
          acrossShards,
          instances,
          steps,
          ...(logger === undefined ? {} : { logger }),
        }),
      inject: [
        PersistenceFeature,
        EntityManagerProvider,
        PersistenceContextProvider,
        ShardScope,
        AcrossShards,
        SagaInstanceMapper,
        SagaStepLogMapper,
        { token: LoggerPort, optional: true },
      ],
    },
    {
      provide: ShardedSagaScopes,
      useFactory: (scope: ShardScope) => new ShardedSagaScopes(scope),
      inject: [ShardScope],
    },
  ],
  exports: [TypeOrmSagaStore, ShardedSagaScopes],
})
export class SagaPostgresModule {}
