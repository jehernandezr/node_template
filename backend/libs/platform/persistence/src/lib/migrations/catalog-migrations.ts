import type { SqlMigration } from './sql-migration.js';

/**
 * Directorio del catálogo global: tenant a región y grupo de shards, y shard
 * lógico a instancia física. Solo datos de enrutamiento, sin datos personales.
 * `version` sube en cada cambio de ubicación; `PostgresDirectoryStore` solo
 * escribe una versión mayor que la guardada.
 */
export const ShardDirectoryMigration: SqlMigration = {
  name: 'PlatformShardDirectory1794600000101',
  up: [
    `CREATE TABLE shard_directory (
  tenant_id text PRIMARY KEY,
  region text NOT NULL,
  shard_group text[] NOT NULL CHECK (shard_group <> '{}'),
  status text NOT NULL,
  version bigint NOT NULL CHECK (version >= 0),
  dedicated boolean NOT NULL,
  updated_at timestamptz NOT NULL
)`,
    `CREATE TABLE shard_instances (
  logical_shard text PRIMARY KEY,
  instance text NOT NULL,
  updated_at timestamptz NOT NULL
)`,
  ],
  down: [
    'DROP TABLE IF EXISTS shard_instances',
    'DROP TABLE IF EXISTS shard_directory',
  ],
};

/**
 * Candados por shard lógico. `PostgresDirectoryStore.putPlacement` los toma con
 * `SELECT … FOR UPDATE`, en orden, antes de contar los tenants de un shard: así
 * dos altas concurrentes sobre un shard vacío se serializan. La tabla no guarda
 * datos, solo existe para tener una fila que bloquear por shard.
 */
export const ShardLocksMigration: SqlMigration = {
  name: 'PlatformShardLocks1794600000102',
  up: ['CREATE TABLE shard_locks (logical_shard text PRIMARY KEY)'],
  down: ['DROP TABLE IF EXISTS shard_locks'],
};

/** Migraciones de la plataforma para el catálogo global, en orden. */
export const catalogMigrations: readonly SqlMigration[] = [
  ShardDirectoryMigration,
  ShardLocksMigration,
];
