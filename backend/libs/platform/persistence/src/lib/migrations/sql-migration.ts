import type { MigrationInterface, QueryRunner } from 'typeorm';
import { invalidConfiguration } from '../errors.js';
import type { SqlSession } from '../sql/sql-session.js';

/**
 * Migración versionada en SQL. `name` termina en un timestamp de 13 dígitos,
 * como pide TypeORM, y fija el orden. Cada sentencia va aparte.
 */
export interface SqlMigration {
  readonly name: string;
  readonly up: readonly string[];
  readonly down: readonly string[];
}

const MIGRATION_NAME = /^[A-Za-z][A-Za-z0-9]*\d{13}$/;

/** Valida el nombre y el orden de un conjunto de migraciones. */
export function assertMigrations(migrations: readonly SqlMigration[]): void {
  let previous = 0;
  for (const migration of migrations) {
    if (!MIGRATION_NAME.test(migration.name)) {
      throw invalidConfiguration(
        'migration name',
        'letters and digits ending in a 13 digit timestamp',
      );
    }
    const timestamp = Number(migration.name.slice(-13));
    if (timestamp <= previous) {
      throw invalidConfiguration(
        'migration order',
        'strictly increasing timestamps',
      );
    }
    previous = timestamp;
  }
}

/**
 * Clase de migración de TypeORM para una {@link SqlMigration}. Así el servicio
 * corre las migraciones de la plataforma con `migration:run` junto a las suyas:
 * `migrations: [...shardMigrations.map(toTypeOrmMigration)]`.
 */
export function toTypeOrmMigration(
  migration: SqlMigration,
): new () => MigrationInterface {
  return class implements MigrationInterface {
    readonly name = migration.name;

    async up(queryRunner: QueryRunner): Promise<void> {
      for (const statement of migration.up) {
        await queryRunner.query(statement);
      }
    }

    async down(queryRunner: QueryRunner): Promise<void> {
      for (const statement of migration.down) {
        await queryRunner.query(statement);
      }
    }
  };
}

/** Tabla donde {@link applyMigrations} registra lo aplicado. */
export const PLATFORM_MIGRATIONS_TABLE = 'platform_schema_migrations';

/**
 * Aplica en orden las migraciones pendientes, cada una en su transacción, y
 * las registra en `platform_schema_migrations`. Para el catálogo, procesos sin
 * TypeORM y pruebas. Los servicios con TypeORM usan {@link toTypeOrmMigration}.
 * Devuelve los nombres aplicados.
 */
export async function applyMigrations(
  session: SqlSession,
  migrations: readonly SqlMigration[],
): Promise<string[]> {
  assertMigrations(migrations);
  await session.query(
    `CREATE TABLE IF NOT EXISTS ${PLATFORM_MIGRATIONS_TABLE} (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
  );
  const applied = new Set(
    (
      await session.query<{ name: string }>(
        `SELECT name FROM ${PLATFORM_MIGRATIONS_TABLE}`,
      )
    ).rows.map((row) => row.name),
  );
  const done: string[] = [];
  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      continue;
    }
    await session.query('BEGIN');
    try {
      for (const statement of migration.up) {
        await session.query(statement);
      }
      await session.query(
        `INSERT INTO ${PLATFORM_MIGRATIONS_TABLE} (name) VALUES ($1)`,
        [migration.name],
      );
      await session.query('COMMIT');
    } catch (error) {
      await session.query('ROLLBACK');
      throw error;
    }
    done.push(migration.name);
  }
  return done;
}
