import { Criteria } from './criteria.js';
import { encodeCursor } from './cursor.js';
import { CriteriaErrorCode, SortDirection } from './enums.js';
import { CriteriaError } from './errors.js';
import { toSql, type SqlOptions } from './sql.js';

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

/** A bind that numbers named placeholders like TypeORM parameters: :p0, :p1... */
function namedBinder(): {
  bind: SqlOptions['bind'];
  values: Map<string, unknown>;
} {
  const values = new Map<string, unknown>();
  let index = 0;
  return {
    values,
    bind: (value: unknown) => {
      const name = `p${index++}`;
      values.set(name, value);
      return `:${name}`;
    },
  };
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

describe('toSql', () => {
  it('renders qualified columns and the bind placeholders when an alias is given', () => {
    const { bind, values } = namedBinder();
    const fragments = toSql(
      Criteria.for<Task>().where('status').eq('open').toAst(),
      {
        columns,
        alias: 't',
        bind,
      },
    );
    expect(fragments.where).toBe('"t"."status" = :p0');
    expect(fragments.orderBy).toBe('"t"."id" ASC');
    expect(values).toEqual(new Map([['p0', 'open']]));
  });

  it('uses unqualified columns without an alias', () => {
    const { bind } = namedBinder();
    const fragments = toSql(
      Criteria.for<Task>().where('status').eq('open').toAst(),
      { columns, bind },
    );
    expect(fragments.where).toBe('"status" = :p0');
  });

  it('keeps the placeholder order for cursor, filter and anyOf with an alias', () => {
    const { bind, values } = namedBinder();
    const token = encodeCursor({ values: [5, 'z'], id: 'row' });
    const fragments = toSql(
      Criteria.for<Task>()
        .where('deletedAt')
        .isNull()
        .anyOf(
          (c) => c.where('status').eq('open'),
          (c) => c.where('priority').gt(2),
        )
        .orderBy('priority', SortDirection.Desc)
        .orderBy('status', SortDirection.Asc)
        .after(token)
        .limit(4)
        .toAst(),
      { columns, alias: 'task', bind },
    );
    expect(fragments.where).toBe(
      '("task"."deleted_at" IS NULL AND ("task"."status" = :p0 OR "task"."priority" > :p1)) AND (("task"."priority" < :p2) OR ("task"."priority" = :p2 AND "task"."status" > :p3) OR ("task"."priority" = :p2 AND "task"."status" = :p3 AND "task"."id" > :p4))',
    );
    expect(fragments.orderBy).toBe(
      '"task"."priority" DESC, "task"."status" ASC, "task"."id" ASC',
    );
    expect(fragments.fetchLimit).toBe(5);
    expect([...values.keys()]).toEqual(['p0', 'p1', 'p2', 'p3', 'p4']);
    expect(values.get('p4')).toBe('row');
  });

  it('returns TRUE and no fetch limit for an empty criteria', () => {
    const { bind } = namedBinder();
    expect(toSql(Criteria.for<Task>().toAst(), { columns, bind })).toEqual({
      where: 'TRUE',
      orderBy: '"id" ASC',
      fetchLimit: null,
    });
  });

  it('uses a custom id column for the cursor and tiebreaker', () => {
    const { bind } = namedBinder();
    const token = encodeCursor({ values: [], id: 'x' });
    const fragments = toSql(Criteria.for<Task>().after(token).toAst(), {
      columns: { pk: 'pk' },
      idColumn: 'pk',
      bind,
    });
    expect(fragments.where).toBe('"pk" > :p0');
    expect(fragments.orderBy).toBe('"pk" ASC');
  });

  describe('identifier validation', () => {
    const { bind } = namedBinder();
    const ast = Criteria.for<Task>().toAst();

    it.each(['a"b', '1abc', 'has space', 'semi;colon', ''])(
      'rejects column name %j',
      (name) => {
        expectCode(
          () => toSql(ast, { columns: { status: name }, bind }),
          CriteriaErrorCode.InvalidValue,
        );
      },
    );

    it('rejects an invalid alias', () => {
      expectCode(
        () => toSql(ast, { columns, alias: 'x y', bind }),
        CriteriaErrorCode.InvalidValue,
      );
    });

    it('rejects an invalid id column', () => {
      expectCode(
        () => toSql(ast, { columns, idColumn: 'a-b', bind }),
        CriteriaErrorCode.InvalidValue,
      );
    });

    it('accepts identifiers with underscores and digits after the first character', () => {
      expect(() =>
        toSql(ast, { columns: { status: '_status2' }, alias: 'T_1', bind }),
      ).not.toThrow();
    });
  });

  it('throws UnknownField for a field missing from columns', () => {
    const { bind } = namedBinder();
    expectCode(
      () =>
        toSql(Criteria.for<Task>().where('priority').eq(1).toAst(), {
          columns: { status: 'status' },
          bind,
        }),
      CriteriaErrorCode.UnknownField,
    );
  });
});
