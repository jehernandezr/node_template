import { Criteria } from './criteria.js';
import type { Cursor } from './cursor.js';
import { SortDirection } from './enums.js';
import { toPostgresSql } from './postgres.js';

interface Row {
  id: string;
  status: string;
  priority: number;
}

const columns = { id: 'id', status: 'status', priority: 'priority' };

/** 25 rows with many ties on priority and status, so the id tiebreaker matters. */
const rows: Row[] = Array.from({ length: 25 }, (_, n) => ({
  id: `row-${String((n * 7) % 25).padStart(2, '0')}`,
  status: ['a', 'b', 'c'][n % 3],
  priority: n % 4,
}));

type Key = { field: keyof Row; direction: SortDirection };

/** Sort keys the database uses: the orderBy terms, then the id with the direction of the last term. */
function keysFor(criteria: Criteria<Row>): Key[] {
  const keys: Key[] = criteria.toAst().order.map((item) => ({
    field: item.field as keyof Row,
    direction: item.direction,
  }));
  if (!keys.some((key) => key.field === 'id')) {
    keys.push({
      field: 'id',
      direction: keys.at(-1)?.direction ?? SortDirection.Asc,
    });
  }
  return keys;
}

function compareRows(a: Row, b: Row, keys: Key[]): number {
  for (const { field, direction } of keys) {
    if (a[field] === b[field]) {
      continue;
    }
    const ascending = (a[field] as number) < (b[field] as number) ? -1 : 1;
    return direction === SortDirection.Asc ? ascending : -ascending;
  }
  return 0;
}

/** Reference for "strictly after the cursor row" under the same ordering the SQL uses. */
function isAfter(row: Row, keys: Key[], cursor: Cursor): boolean {
  const expected: unknown[] = [...cursor.values, cursor.id];
  for (let index = 0; index < keys.length; index++) {
    const value = row[keys[index].field];
    if (value === expected[index]) {
      continue;
    }
    return keys[index].direction === SortDirection.Asc
      ? (value as number) > (expected[index] as number)
      : (value as number) < (expected[index] as number);
  }
  return false;
}

/**
 * Walks every page by repeatedly applying the SQL fragments to an in-memory copy of the dataset.
 * Each step filters with the cursor predicate, sorts with the same keys, fetches limit + 1 rows
 * (the last param of the SQL) and calls toPage to get the next cursor.
 */
function walk(
  base: Criteria<Row>,
  pageSize: number,
): { ids: string[]; pages: number } {
  const ids: string[] = [];
  let criteria = base.limit(pageSize);
  let pages = 0;
  for (let guard = 0; guard < 50; guard++) {
    const keys = keysFor(criteria);
    const ast = criteria.toAst();
    const sql = toPostgresSql(ast, { columns });
    const visible = rows
      .filter((row) => ast.after === undefined || isAfter(row, keys, ast.after))
      .sort((a, b) => compareRows(a, b, keys));
    const fetched = visible.slice(0, Number(sql.params.at(-1)));
    const page = sql.toPage(
      fetched,
      (row) => row.id,
      (row) =>
        keys.filter((key) => key.field !== 'id').map((key) => row[key.field]),
    );
    pages += 1;
    ids.push(...page.items.map((row) => row.id));
    if (page.nextCursor === null) {
      return { ids, pages };
    }
    criteria = base.limit(pageSize).after(page.nextCursor);
  }
  throw new Error('pagination did not terminate');
}

function expectedIds(criteria: Criteria<Row>): string[] {
  const keys = keysFor(criteria);
  return [...rows].sort((a, b) => compareRows(a, b, keys)).map((row) => row.id);
}

describe('keyset pagination across pages', () => {
  const cases: [string, (c: Criteria<Row>) => Criteria<Row>][] = [
    ['single descending key', (c) => c.orderBy('priority', SortDirection.Desc)],
    ['ascending key then id', (c) => c.orderBy('status')],
    [
      'mixed directions',
      (c) =>
        c
          .orderBy('priority', SortDirection.Desc)
          .orderBy('status', SortDirection.Asc),
    ],
    [
      'all descending',
      (c) =>
        c
          .orderBy('priority', SortDirection.Desc)
          .orderBy('status', SortDirection.Desc),
    ],
    [
      'explicit id last',
      (c) =>
        c
          .orderBy('status', SortDirection.Desc)
          .orderBy('id', SortDirection.Desc),
    ],
    ['no ordering', (c) => c],
  ];

  it.each(cases)(
    '%s: pages advance without repeats or gaps',
    (_name, shape) => {
      const base = shape(Criteria.for<Row>());
      const { ids, pages } = walk(base, 10);
      expect(pages).toBe(3);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toEqual(expectedIds(base));
    },
  );

  it.each(cases)(
    '%s: small page size of 4 covers every row once',
    (_name, shape) => {
      const base = shape(Criteria.for<Row>());
      const { ids } = walk(base, 4);
      expect(ids).toEqual(expectedIds(base));
    },
  );

  it('a descending cursor points at the last returned row', () => {
    const base = Criteria.for<Row>()
      .orderBy('priority', SortDirection.Desc)
      .limit(10);
    const sql = toPostgresSql(base.toAst(), { columns });
    const first = sql.toPage(
      rows.slice(0, 11).sort((a, b) => compareRows(a, b, keysFor(base))),
      (row) => row.id,
      (row) => [row.priority],
    );
    expect(first.items).toHaveLength(10);
    const next = base.after(first.nextCursor as string).toAst();
    expect(next.after).toEqual({
      values: [first.items[9].priority],
      id: first.items[9].id,
    });
  });
});
