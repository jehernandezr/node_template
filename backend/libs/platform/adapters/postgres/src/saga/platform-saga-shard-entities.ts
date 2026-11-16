import type { EntityClass, MigrationClass } from '@platform/persistence';
import { SagaInstanceEntity } from './saga-instance.entity.js';
import { SagaStepLogEntity } from './saga-step-log.entity.js';
import { CreateSagaSchema1795000000001 } from './migrations/1795000000001-create-saga-schema.migration.js';

/** Entidades de la bitácora de sagas, que la app suma a las de `platformShardEntities`. */
export const platformSagaShardEntities: readonly EntityClass[] = [
  SagaInstanceEntity,
  SagaStepLogEntity,
];

/**
 * Migraciones de la bitácora de sagas para cada shard, que la app suma a las
 * de `platformShardMigrations`. Usan el rango de timestamps 1795000000000 a
 * 1795000999999, propio de las sagas.
 */
export const platformSagaShardMigrations: readonly MigrationClass[] = [
  CreateSagaSchema1795000000001,
];
