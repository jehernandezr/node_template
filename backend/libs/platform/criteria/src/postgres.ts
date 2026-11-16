import type { CriteriaAst } from './ast.js';
import { takePage, type Page } from './page.js';
import { toSql, type SqlOptions } from './sql.js';

/** Options for {@link toPostgresSql}. */
export type PostgresOptions = Omit<SqlOptions, 'bind'>;

/** Parameterized PostgreSQL fragments. Values only appear in `params`. */
export interface PostgresSql {
  /** Boolean expression, `TRUE` when empty. Includes the keyset condition. */
  readonly where: string;
  readonly orderBy: string;
  /** `$n` bound to `limit + 1`, or `ALL` when unlimited. */
  readonly limit: string;
  readonly params: unknown[];
  /**
   * Applies the original limit to the fetched rows and builds the next cursor.
   * `getSortValues` returns the values of the orderBy fields other than id, in order.
   */
  readonly toPage: <T>(
    rows: readonly T[],
    getId: (row: T) => string,
    getSortValues: (row: T) => readonly unknown[],
  ) => Page<T>;
}

/** Escapes `%`, `_` and `\` so user text matches literally inside a LIKE or ILIKE pattern. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Translates a criteria AST into parameterized PostgreSQL with `$1, $2...` placeholders.
 * @throws CriteriaError as described in `toSql`.
 */
export function toPostgresSql(
  ast: CriteriaAst,
  options: PostgresOptions,
): PostgresSql {
  const params: unknown[] = [];
  const bind = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };
  const fragments = toSql(ast, { ...options, bind });
  const limit =
    fragments.fetchLimit === null ? 'ALL' : bind(fragments.fetchLimit);
  return {
    where: fragments.where,
    orderBy: fragments.orderBy,
    limit,
    params,
    toPage: (rows, getId, getSortValues) =>
      takePage(rows, ast.limit, getId, getSortValues),
  };
}
