import { invalidConfiguration } from '../errors.js';
import type { SqlSession } from '../sql/sql-session.js';

/**
 * Migración versionada en SQL. `name` termina en un timestamp de 13 dígitos
 * que fija el orden. Cada sentencia va aparte.
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

/** Tabla donde {@link applyMigrations} registra lo aplicado. */
export const PLATFORM_MIGRATIONS_TABLE = 'platform_schema_migrations';

/**
 * Llave del candado consultivo de {@link applyMigrations}. Es fija para que
 * todos los procesos que migran una misma base compitan por el mismo candado.
 */
export const MIGRATIONS_LOCK_KEY = 7_948_310_215_001;

/**
 * Aplica en orden las migraciones pendientes, cada una en su transacción, y
 * las registra en `platform_schema_migrations`. Devuelve los nombres aplicados.
 *
 * Toma `pg_advisory_lock` en la sesión durante todo el ciclo: si dos tareas
 * arrancan a la vez, la segunda espera y, al entrar, ya ve aplicadas las
 * migraciones de la primera. La sesión debe ser una conexión dedicada, fuera
 * de una transacción, porque el candado y los `BEGIN` son de la sesión.
 */
export async function applyMigrations(
  session: SqlSession,
  migrations: readonly SqlMigration[],
): Promise<string[]> {
  assertMigrations(migrations);
  await session.query('SELECT pg_advisory_lock($1)', [MIGRATIONS_LOCK_KEY]);
  let applied: string[];
  try {
    applied = await applyPending(session, migrations);
  } catch (error) {
    // Si la conexión se cayó, el candado se libera con ella; lo que importa
    // es el error de la migración.
    await session
      .query('SELECT pg_advisory_unlock($1)', [MIGRATIONS_LOCK_KEY])
      .catch(() => undefined);
    throw error;
  }
  await session.query('SELECT pg_advisory_unlock($1)', [MIGRATIONS_LOCK_KEY]);
  return applied;
}

async function applyPending(
  session: SqlSession,
  migrations: readonly SqlMigration[],
): Promise<string[]> {
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
      await rollbackQuietly(session);
      throw error;
    }
    done.push(migration.name);
  }
  return done;
}

/**
 * Deshace sin tapar el error original: si la conexión se cayó, el `ROLLBACK`
 * también falla y lo que importa es por qué falló la migración.
 */
async function rollbackQuietly(session: SqlSession): Promise<void> {
  try {
    await session.query('ROLLBACK');
  } catch {
    // El error de la migración es el que se propaga.
  }
}
