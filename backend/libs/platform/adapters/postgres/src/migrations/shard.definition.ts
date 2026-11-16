import type { DatabaseSetDefinition } from '@platform/persistence';
import {
  platformShardEntities,
  platformShardMigrations,
} from '../platform-database-sets.js';

/** Definición que lee la CLI `migration-generate` para generar las migraciones de las tablas de shard de la plataforma. */
const definition: DatabaseSetDefinition = {
  entities: platformShardEntities,
  migrations: platformShardMigrations,
};

export default definition;
