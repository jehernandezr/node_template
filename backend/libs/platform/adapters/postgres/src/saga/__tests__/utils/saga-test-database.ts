import {
  PersistenceFeature,
  PlatformPersistenceMigrations,
} from '@platform/persistence';
import { ShardedTestDatabase } from '@platform/persistence/test-utils';
import { ShardKey } from '@platform/sharding';
import {
  platformSagaShardEntities,
  platformSagaShardMigrations,
} from '../../platform-saga-shard-entities.js';
import { SagaInstanceMapper } from '../../saga-instance.mapper.js';
import { SagaStepLogMapper } from '../../saga-step-log.mapper.js';
import { TypeOrmSagaStore } from '../../typeorm-saga-store.js';

/**
 * Base de pruebas de la bitácora de sagas: dos shards en Postgres real con las
 * migraciones de la plataforma y las de sagas. Así las pruebas ejercen el
 * esquema que la aplicación despliega.
 */
export class SagaTestDatabase {
  readonly db: ShardedTestDatabase;
  readonly feature: PersistenceFeature;

  constructor() {
    this.db = new ShardedTestDatabase({
      shard: {
        entities: [...platformSagaShardEntities],
        migrations: [
          ...PlatformPersistenceMigrations.shard,
          ...platformSagaShardMigrations,
        ],
      },
      catalog: { entities: [], migrations: [] },
    });
    this.feature = new PersistenceFeature({
      key: ShardKey.Tenant,
      entities: [...platformSagaShardEntities],
    });
  }

  /** Un `TypeOrmSagaStore` cableado como lo hace `SagaPostgresModule`. */
  createStore(): TypeOrmSagaStore {
    const kit = this.db.kitFor(this.feature);
    return new TypeOrmSagaStore({
      provider: kit.provider,
      feature: this.feature,
      context: kit.context,
      scope: kit.scope,
      acrossShards: this.db.acrossShards,
      instances: new SagaInstanceMapper(),
      steps: new SagaStepLogMapper(),
    });
  }
}
