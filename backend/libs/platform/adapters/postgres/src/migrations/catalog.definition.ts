import type { DatabaseSetDefinition } from '@platform/persistence';
import {
  platformCatalogEntities,
  platformCatalogMigrations,
} from '../platform-database-sets.js';

/** Definition the `migration-generate` CLI reads to generate the migrations of the platform catalog. */
const definition: DatabaseSetDefinition = {
  entities: platformCatalogEntities,
  migrations: platformCatalogMigrations,
};

export default definition;
