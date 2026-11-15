import type { MigrationInterface } from 'typeorm';
import type { EntityClass } from '../metadata/entity-metadata.js';

/** Clase de una migración de TypeORM. */
export type MigrationClass = new () => MigrationInterface;

/** Entidades y migraciones de una clase de base: las de los shards o las del catálogo. */
export interface DatabaseSetDefinition {
  readonly entities: readonly EntityClass[];
  readonly migrations: readonly MigrationClass[];
}
