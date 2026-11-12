import { Criteria } from './criteria.js';
import { encodeCursor } from './cursor.js';
import {
  CriteriaErrorCode,
  LogicalOperator,
  NodeKind,
  Operator,
  SortDirection,
} from './enums.js';
import { CriteriaError } from './errors.js';
import { escapeLike, toPostgresSql } from './postgres.js';

interface Task {
  id: string;
  status: string;
  priority: number;
  deletedAt: string | null;
}

const columns = {
  id: 'id',
  status: 'status',
  priority: 'priority',
  deletedAt: 'deleted_at',
};

function sqlFor(criteria: Criteria<Task>) {
  return toPostgresSql(criteria.toAst(), { columns });
}

function expectCode(fn: () => unknown, code: CriteriaErrorCode): void {
  let caught: unknown;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(CriteriaError);
  expect((caught as CriteriaError).code).toBe(code);
}

describe('toPostgresSql', () => {
  it('returns neutral defaults for an empty criteria', () => {
    expect(sqlFor(Criteria.for<Task>())).toEqual({
      where: 'TRUE',
      orderBy: '"id" ASC',
      limit: 'ALL',
      params: [],
      toPage: expect.any(Function) as unknown,
    });
  });

  it.each([
    [
      'eq',
      (c: Criteria<Task>) => c.where('status').eq('open'),
      '"status" = $1',
      ['open'],
    ],
    [
      'eq null',
      (c: Criteria<Task>) => c.where('deletedAt').eq(null),
      '"deleted_at" IS NULL',
      [],
    ],
    [
      'ne value',
      (c: Criteria<Task>) => c.where('status').ne('open'),
      '"status" IS DISTINCT FROM $1',
      ['open'],
    ],
    [
      'ne null',
      (c: Criteria<Task>) => c.where('deletedAt').ne(null),
      '"deleted_at" IS NOT NULL',
      [],
    ],
    [
      'gt',
      (c: Criteria<Task>) => c.where('priority').gt(18),
      '"priority" > $1',
      [18],
    ],
    [
      'gte',
      (c: Criteria<Task>) => c.where('priority').gte(18),
      '"priority" >= $1',
      [18],
    ],
    [
      'lt',
      (c: Criteria<Task>) => c.where('priority').lt(18),
      '"priority" < $1',
      [18],
    ],
    [
      'lte',
      (c: Criteria<Task>) => c.where('priority').lte(18),
      '"priority" <= $1',
      [18],
    ],
    [
      'in',
      (c: Criteria<Task>) => c.where('status').in(['a', 'b']),
      '"status" IN ($1, $2)',
      ['a', 'b'],
    ],
    [
      'notIn',
      (c: Criteria<Task>) => c.where('status').notIn(['a', 'b']),
      '"status" NOT IN ($1, $2)',
      ['a', 'b'],
    ],
    [
      'like',
      (c: Criteria<Task>) => c.where('status').like('a%'),
      '"status" LIKE $1',
      ['a%'],
    ],
    [
      'ilike',
      (c: Criteria<Task>) => c.where('status').ilike('%A'),
      '"status" ILIKE $1',
      ['%A'],
    ],
    [
      'isNull',
      (c: Criteria<Task>) => c.where('deletedAt').isNull(),
      '"deleted_at" IS NULL',
      [],
    ],
    [
      'isNotNull',
      (c: Criteria<Task>) => c.where('deletedAt').isNotNull(),
      '"deleted_at" IS NOT NULL',
      [],
    ],
    [
      'between',
      (c: Criteria<Task>) => c.where('priority').between(1, 9),
      '"priority" BETWEEN $1 AND $2',
      [1, 9],
    ],
  ])(
    'renders %s with placeholders and params',
    (_name, build, where, params) => {
      const sql = sqlFor(build(Criteria.for<Task>()));
      expect(sql.where).toBe(where);
      expect(sql.params).toEqual(params);
    },
  );

  it('renders empty in as FALSE and empty notIn as TRUE, without params', () => {
    expect(sqlFor(Criteria.for<Task>().where('status').in([]))).toMatchObject({
      where: 'FALSE',
      params: [],
    });
    expect(
      sqlFor(Criteria.for<Task>().where('status').notIn([])),
    ).toMatchObject({ where: 'TRUE', params: [] });
  });

  it('renders anyOf precedence: deleted IS NULL AND (open OR pending)', () => {
    const sql = sqlFor(
      Criteria.for<Task>()
        .where('deletedAt')
        .isNull()
        .anyOf(
          (c) => c.where('status').eq('open'),
          (c) => c.where('status').eq('pending'),
        ),
    );
    expect(sql.where).toBe(
      '"deleted_at" IS NULL AND ("status" = $1 OR "status" = $2)',
    );
    expect(sql.params).toEqual(['open', 'pending']);
  });

  it('parenthesizes AND branches inside an OR and keeps params in order', () => {
    const sql = sqlFor(
      Criteria.for<Task>()
        .where('status')
        .eq('a')
        .anyOf(
          (c) => c.where('status').eq('b').where('priority').gt(2),
          (c) => c.where('priority').lt(1),
        ),
    );
    expect(sql.where).toBe(
      '"status" = $1 AND (("status" = $2 AND "priority" > $3) OR "priority" < $4)',
    );
    expect(sql.params).toEqual(['a', 'b', 2, 1]);
  });

  it('orders by the requested columns and appends the id as tiebreaker in the last direction', () => {
    expect(
      sqlFor(
        Criteria.for<Task>()
          .orderBy('priority', SortDirection.Desc)
          .orderBy('status'),
      ).orderBy,
    ).toBe('"priority" DESC, "status" ASC, "id" ASC');
    expect(
      sqlFor(Criteria.for<Task>().orderBy('priority', SortDirection.Desc))
        .orderBy,
    ).toBe('"priority" DESC, "id" DESC');
  });

  it('does not append the id when it is already the last ordering term', () => {
    expect(
      sqlFor(Criteria.for<Task>().orderBy('id', SortDirection.Desc)).orderBy,
    ).toBe('"id" DESC');
  });

  it('rejects an id that is not the last ordering term', () => {
    expectCode(
      () => sqlFor(Criteria.for<Task>().orderBy('id').orderBy('status')),
      CriteriaErrorCode.InvalidValue,
    );
  });

  it('binds the limit as limit + 1 so the next page can be detected', () => {
    expect(sqlFor(Criteria.for<Task>().limit(20))).toMatchObject({
      limit: '$1',
      params: [21],
    });
  });

  describe('keyset cursor', () => {
    it('uses a row comparison when all directions are ascending', () => {
      const token = encodeCursor({ values: [3], id: 'x' });
      const sql = sqlFor(Criteria.for<Task>().orderBy('priority').after(token));
      expect(sql).toMatchObject({
        where: '("priority", "id") > ($1, $2)',
        orderBy: '"priority" ASC, "id" ASC',
        params: [3, 'x'],
      });
    });

    it('uses a row comparison with < when all directions are descending', () => {
      const token = encodeCursor({ values: [3, 'b'], id: 'x' });
      const sql = sqlFor(
        Criteria.for<Task>()
          .orderBy('priority', SortDirection.Desc)
          .orderBy('status', SortDirection.Desc)
          .after(token),
      );
      expect(sql).toMatchObject({
        where: '("priority", "status", "id") < ($1, $2, $3)',
        orderBy: '"priority" DESC, "status" DESC, "id" DESC',
        params: [3, 'b', 'x'],
      });
    });

    it('expands mixed directions into an OR chain of equalities', () => {
      const token = encodeCursor({ values: [3, 'b'], id: 'x' });
      const sql = sqlFor(
        Criteria.for<Task>()
          .orderBy('priority', SortDirection.Desc)
          .orderBy('status', SortDirection.Asc)
          .after(token),
      );
      expect(sql.where).toBe(
        '(("priority" < $1) OR ("priority" = $1 AND "status" > $2) OR ("priority" = $1 AND "status" = $2 AND "id" > $3))',
      );
      expect(sql.orderBy).toBe('"priority" DESC, "status" ASC, "id" ASC');
      expect(sql.params).toEqual([3, 'b', 'x']);
    });

    it('compares only the id when there is no ordering', () => {
      const token = encodeCursor({ values: [], id: 'x' });
      expect(sqlFor(Criteria.for<Task>().after(token))).toMatchObject({
        where: '"id" > $1',
        params: ['x'],
      });
    });

    it('places the cursor after the filter and before the limit', () => {
      const token = encodeCursor({ values: [3], id: 'x' });
      const sql = sqlFor(
        Criteria.for<Task>()
          .where('status')
          .eq('open')
          .orderBy('priority', SortDirection.Desc)
          .after(token)
          .limit(10),
      );
      expect(sql).toEqual({
        where: '"status" = $1 AND ("priority", "id") < ($2, $3)',
        orderBy: '"priority" DESC, "id" DESC',
        limit: '$4',
        params: ['open', 3, 'x', 11],
        toPage: expect.any(Function) as unknown,
      });
    });

    it('rejects a cursor whose value count does not match the ordering', () => {
      const token = encodeCursor({ values: [1, 2], id: 'x' });
      expectCode(
        () => sqlFor(Criteria.for<Task>().orderBy('priority').after(token)),
        CriteriaErrorCode.InvalidValue,
      );
    });
  });

  it('rejects unknown fields in filters and ordering', () => {
    expectCode(
      () =>
        toPostgresSql(Criteria.for<Task>().where('status').eq('x').toAst(), {
          columns: { id: 'id' },
        }),
      CriteriaErrorCode.UnknownField,
    );
    expectCode(
      () => sqlFor(Criteria.for<Task>().orderBy('nope' as 'status')),
      CriteriaErrorCode.UnknownField,
    );
  });

  it('does not treat inherited object keys as columns', () => {
    expectCode(
      () =>
        sqlFor(
          Criteria.for<Task>()
            .where('constructor' as 'status')
            .eq('x'),
        ),
      CriteriaErrorCode.UnknownField,
    );
  });

  it('never interpolates values into the SQL text', () => {
    const payload = "x'; DROP TABLE users; --";
    const sql = sqlFor(Criteria.for<Task>().where('status').eq(payload));
    expect(sql.where).not.toContain('DROP');
    expect(sql.params).toEqual([payload]);
  });

  it('rejects a malformed AST: unknown logical operator, unknown operator and bad values', () => {
    const base = Criteria.for<Task>().toAst();
    expectCode(
      () =>
        toPostgresSql(
          {
            ...base,
            filter: {
              kind: NodeKind.Group,
              operator: 'xor' as LogicalOperator,
              children: [
                {
                  kind: NodeKind.Condition,
                  field: 'status',
                  operator: Operator.Eq,
                  value: 'a',
                },
              ],
            },
          },
          { columns },
        ),
      CriteriaErrorCode.InvalidValue,
    );
    expectCode(
      () =>
        toPostgresSql(
          {
            ...base,
            filter: {
              kind: NodeKind.Group,
              operator: LogicalOperator.And,
              children: [
                {
                  kind: NodeKind.Condition,
                  field: 'status',
                  operator: 'regex' as Operator,
                  value: 'a',
                },
              ],
            },
          },
          { columns },
        ),
      CriteriaErrorCode.InvalidValue,
    );
    expectCode(
      () =>
        toPostgresSql(
          {
            ...base,
            filter: {
              kind: NodeKind.Group,
              operator: LogicalOperator.And,
              children: [
                {
                  kind: NodeKind.Condition,
                  field: 'priority',
                  operator: Operator.Gt,
                  value: null,
                },
              ],
            },
          },
          { columns },
        ),
      CriteriaErrorCode.InvalidValue,
    );
    expectCode(
      () =>
        toPostgresSql(
          {
            ...base,
            filter: {
              kind: NodeKind.Group,
              operator: LogicalOperator.And,
              children: [
                {
                  kind: NodeKind.Condition,
                  field: 'status',
                  operator: Operator.Eq,
                },
              ],
            },
          },
          { columns },
        ),
      CriteriaErrorCode.InvalidValue,
    );
  });
});

describe('escapeLike', () => {
  it('escapes %, _ and backslash', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });

  it('leaves plain text unchanged', () => {
    expect(escapeLike('plain text')).toBe('plain text');
  });
});
