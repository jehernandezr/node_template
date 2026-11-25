import type { DatabaseSetDefinition } from '@platform/persistence';
import {
  platformShardEntities,
  platformShardMigrations,
} from '../platform-database-sets.js';

/** Definition the `migration-generate` CLI reads to generate the migrations of the platform shard tables. */
const definition: DatabaseSetDefinition = {
  entities: platformShardEntities,
  migrations: platformShardMigrations,
};

export default definition;
