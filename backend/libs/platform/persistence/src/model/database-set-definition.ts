import type { MigrationInterface } from 'typeorm';
import type { EntityClass } from '../metadata/entity-metadata.js';

/** Class of a TypeORM migration. */
export type MigrationClass = new () => MigrationInterface;

/** Entities and migrations of a database kind: those of the shards or those of the catalog. */
export interface DatabaseSetDefinition {
  readonly entities: readonly EntityClass[];
  readonly migrations: readonly MigrationClass[];
}
