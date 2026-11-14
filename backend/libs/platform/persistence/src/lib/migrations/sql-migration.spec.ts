import type { SqlResult, SqlSession } from '../sql/sql-session.js';
import {
  applyMigrations,
  MIGRATIONS_LOCK_KEY,
  type SqlMigration,
} from './sql-migration.js';

const FIRST: SqlMigration = {
  name: 'First1794600000001',
  up: ['CREATE TABLE a (id int)'],
  down: [],
};
const SECOND: SqlMigration = {
  name: 'Second1794600000002',
  up: ['CREATE TABLE b (id int)', 'BROKEN'],
  down: [],
};

/** Sesión falsa: registra cada sentencia y falla en las que pida `fail`. */
function fakeSession(
  options: {
    applied?: string[];
    fail?: (sql: string) => boolean;
  } = {},
) {
  const statements: { sql: string; params?: readonly unknown[] }[] = [];
  const session: SqlSession = {
    query: async <Row>(sql: string, params?: readonly unknown[]) => {
      statements.push({ sql, params });
      if (options.fail?.(sql) === true) {
        throw new Error(`failed: ${sql}`);
      }
      const rows = sql.startsWith('SELECT name FROM')
        ? (options.applied ?? []).map((name) => ({ name }))
        : [];
      return { rows, rowCount: rows.length } as SqlResult<Row>;
    },
  };
  return { session, sql: () => statements.map((s) => s.sql), statements };
}

describe('applyMigrations', () => {
  it('holds the advisory lock around the whole cycle and skips applied ones', async () => {
    const { session, sql, statements } = fakeSession({
      applied: [FIRST.name],
    });
    const applied = await applyMigrations(session, [
      FIRST,
      { ...SECOND, up: ['CREATE TABLE b (id int)'] },
    ]);
    expect(applied).toEqual([SECOND.name]);
    expect(sql()[0]).toBe('SELECT pg_advisory_lock($1)');
    expect(statements[0].params).toEqual([MIGRATIONS_LOCK_KEY]);
    expect(sql().at(-1)).toBe('SELECT pg_advisory_unlock($1)');
    expect(sql()).not.toContain('CREATE TABLE a (id int)');
    expect(sql()).toContain('CREATE TABLE b (id int)');
  });

  it('rolls back the failed migration and keeps its error even if ROLLBACK fails', async () => {
    const { session, sql } = fakeSession({
      fail: (statement) => statement === 'BROKEN' || statement === 'ROLLBACK',
    });
    await expect(applyMigrations(session, [FIRST, SECOND])).rejects.toThrow(
      'failed: BROKEN',
    );
    expect(sql()).toContain('ROLLBACK');
    expect(sql().at(-1)).toBe('SELECT pg_advisory_unlock($1)');
  });

  it('validates names and order before taking the lock', async () => {
    const { session, sql } = fakeSession();
    await expect(applyMigrations(session, [SECOND, FIRST])).rejects.toThrow(
      'migration order must be strictly increasing timestamps',
    );
    expect(sql()).toEqual([]);
  });
});
