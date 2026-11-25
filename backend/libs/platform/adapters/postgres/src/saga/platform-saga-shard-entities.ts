import type { EntityClass, MigrationClass } from '@platform/persistence';
import { SagaInstanceEntity } from './saga-instance.entity.js';
import { SagaStepLogEntity } from './saga-step-log.entity.js';
import { CreateSagaSchema1795000000001 } from './migrations/1795000000001-create-saga-schema.migration.js';

/** Saga log entities, which the app adds to those of `platformShardEntities`. */
export const platformSagaShardEntities: readonly EntityClass[] = [
  SagaInstanceEntity,
  SagaStepLogEntity,
];

/**
 * Saga log migrations for each shard, which the app adds to those
 * of `platformShardMigrations`. They use the timestamp range 1795000000000 to
 * 1795000999999, reserved for sagas.
 */
export const platformSagaShardMigrations: readonly MigrationClass[] = [
  CreateSagaSchema1795000000001,
];
