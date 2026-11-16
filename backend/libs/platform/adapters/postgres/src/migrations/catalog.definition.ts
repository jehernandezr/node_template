import type { DatabaseSetDefinition } from '@platform/persistence';
import {
  platformCatalogEntities,
  platformCatalogMigrations,
} from '../platform-database-sets.js';

/** Definición que lee la CLI `migration-generate` para generar las migraciones del catálogo de la plataforma. */
const definition: DatabaseSetDefinition = {
  entities: platformCatalogEntities,
  migrations: platformCatalogMigrations,
};

export default definition;
