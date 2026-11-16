import type { DatabaseSetDefinition } from '@platform/persistence';

/**
 * Entidades y migraciones propias del servicio, una por clase de base. Son las
 * definiciones de referencia con las que se crean los `DataSource` de TypeORM;
 * la plataforma suma las suyas (`ServiceDatabaseSets`).
 */
export interface ServiceMigrations {
  readonly catalog: DatabaseSetDefinition;
  readonly shard: DatabaseSetDefinition;
}
