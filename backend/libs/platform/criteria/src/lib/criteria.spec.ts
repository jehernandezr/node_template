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

interface Task {
  id: string;
  status: string;
  priority: number;
  deletedAt: string | null;
  tags?: string;
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

describe('Criteria', () => {
  describe('AST shape', () => {
    it('starts empty with an AND group and no limit or cursor keys', () => {
      const ast = Criteria.for<Task>().toAst();
      expect(ast).toEqual({
        filter: {
          kind: NodeKind.Group,
          operator: LogicalOperator.And,
          children: [],
        },
        order: [],
      });
      expect(Object.keys(ast)).toEqual(['filter', 'order']);
    });

    it('builds a condition node for each operator', () => {
      const cases: [Operator, (criteria: Criteria<Task>) => Criteria<Task>][] =
        [
          [Operator.Eq, (c) => c.where('priority').eq(1)],
          [Operator.Ne, (c) => c.where('priority').ne(1)],
          [Operator.Gt, (c) => c.where('priority').gt(1)],
          [Operator.Gte, (c) => c.where('priority').gte(1)],
          [Operator.Lt, (c) => c.where('priority').lt(1)],
          [Operator.Lte, (c) => c.where('priority').lte(1)],
          [Operator.In, (c) => c.where('priority').in([1])],
          [Operator.NotIn, (c) => c.where('priority').notIn([1])],
          [Operator.Like, (c) => c.where('status').like('a%')],
          [Operator.ILike, (c) => c.where('status').ilike('a%')],
          [Operator.IsNull, (c) => c.where('priority').isNull()],
          [Operator.IsNotNull, (c) => c.where('priority').isNotNull()],
          [Operator.Between, (c) => c.where('priority').between(1, 2)],
        ];
      for (const [operator, build] of cases) {
        const [node] = build(Criteria.for<Task>()).toAst().filter.children;
        expect(node.kind).toBe(NodeKind.Condition);
        expect(node).toMatchObject({ operator });
      }
    });

    it('omits value for isNull and isNotNull', () => {
      const [node] = Criteria.for<Task>().where('deletedAt').isNull().toAst()
        .filter.children;
      expect(node).toEqual({
        kind: NodeKind.Condition,
        field: 'deletedAt',
        operator: Operator.IsNull,
      });
      expect('value' in node).toBe(false);
    });

    it('stores between bounds as a pair', () => {
      const [node] = Criteria.for<Task>()
        .where('priority')
        .between(1, 5)
        .toAst().filter.children;
      expect(node).toEqual({
        kind: NodeKind.Condition,
        field: 'priority',
        operator: Operator.Between,
        value: [1, 5],
      });
    });

    it('stores eq(null) as a null value', () => {
      const [node] = Criteria.for<Task>().where('deletedAt').eq(null).toAst()
        .filter.children;
      expect(node).toEqual({
        kind: NodeKind.Condition,
        field: 'deletedAt',
        operator: Operator.Eq,
        value: null,
      });
    });

    it('joins consecutive where calls with AND at the top level', () => {
      const ast = Criteria.for<Task>()
        .where('status')
        .eq('open')
        .where('priority')
        .gte(2)
        .toAst();
      expect(ast.filter.operator).toBe(LogicalOperator.And);
      expect(ast.filter.children).toEqual([
        {
          kind: NodeKind.Condition,
          field: 'status',
          operator: Operator.Eq,
          value: 'open',
        },
        {
          kind: NodeKind.Condition,
          field: 'priority',
          operator: Operator.Gte,
          value: 2,
        },
      ]);
    });
  });

  describe('NULL semantics', () => {
    it('rejects eq and ne with undefined', () => {
      expectCode(
        () =>
          Criteria.for<Task>()
            .where('status')
            .eq(undefined as unknown as string),
        CriteriaErrorCode.InvalidValue,
      );
      expectCode(
        () =>
          Criteria.for<Task>()
            .where('status')
            .ne(undefined as unknown as string),
        CriteriaErrorCode.InvalidValue,
      );
    });

    it('rejects null and undefined for ordering, between and list operators', () => {
      const criteria = Criteria.for<Task>();
      expectCode(
        () => criteria.where('priority').gt(null as unknown as number),
        CriteriaErrorCode.InvalidValue,
      );
      expectCode(
        () => criteria.where('priority').gte(undefined as unknown as number),
        CriteriaErrorCode.InvalidValue,
      );
      expectCode(
        () => criteria.where('priority').lt(null as unknown as number),
        CriteriaErrorCode.InvalidValue,
      );
      expectCode(
        () => criteria.where('priority').lte(null as unknown as number),
        CriteriaErrorCode.InvalidValue,
      );
      expectCode(
        () => criteria.where('priority').between(null as unknown as number, 2),
        CriteriaErrorCode.InvalidValue,
      );
      expectCode(
        () =>
          criteria.where('priority').between(1, undefined as unknown as number),
        CriteriaErrorCode.InvalidValue,
      );
      expectCode(
        () => criteria.where('priority').in([1, null as unknown as number]),
        CriteriaErrorCode.InvalidValue,
      );
      expectCode(
        () =>
          criteria.where('priority').notIn([undefined as unknown as number]),
        CriteriaErrorCode.InvalidValue,
      );
    });
  });

  describe('anyOf', () => {
    it('adds one term: an OR group of AND branches', () => {
      const ast = Criteria.for<Task>()
        .where('deletedAt')
        .isNull()
        .anyOf(
          (c) => c.where('status').eq('open'),
          (c) => c.where('status').eq('pending').where('priority').gt(1),
        )
        .toAst();
      expect(ast.filter.children).toEqual([
        {
          kind: NodeKind.Condition,
          field: 'deletedAt',
          operator: Operator.IsNull,
        },
        {
          kind: NodeKind.Group,
          operator: LogicalOperator.Or,
          children: [
            {
              kind: NodeKind.Group,
              operator: LogicalOperator.And,
              children: [
                {
                  kind: NodeKind.Condition,
                  field: 'status',
                  operator: Operator.Eq,
                  value: 'open',
                },
              ],
            },
            {
              kind: NodeKind.Group,
              operator: LogicalOperator.And,
              children: [
                {
                  kind: NodeKind.Condition,
                  field: 'status',
                  operator: Operator.Eq,
                  value: 'pending',
                },
                {
                  kind: NodeKind.Condition,
                  field: 'priority',
                  operator: Operator.Gt,
                  value: 1,
                },
              ],
            },
          ],
        },
      ]);
    });

    it('keeps later where calls ANDed outside the OR group', () => {
      const ast = Criteria.for<Task>()
        .anyOf(
          (c) => c.where('status').eq('a'),
          (c) => c.where('status').eq('b'),
        )
        .where('priority')
        .gt(0)
        .toAst();
      expect(ast.filter.children).toHaveLength(2);
      expect(ast.filter.children[0].kind).toBe(NodeKind.Group);
      expect(ast.filter.children[1]).toMatchObject({
        field: 'priority',
        operator: Operator.Gt,
      });
    });

    it('rejects no branches, empty branches and non-condition content', () => {
      expectCode(
        () => Criteria.for<Task>().anyOf(),
        CriteriaErrorCode.InvalidValue,
      );
      expectCode(
        () => Criteria.for<Task>().anyOf((c) => c),
        CriteriaErrorCode.InvalidValue,
      );
      expectCode(
        () =>
          Criteria.for<Task>().anyOf((c) =>
            c.where('status').eq('a').orderBy('priority'),
          ),
        CriteriaErrorCode.InvalidValue,
      );
      expectCode(
        () =>
          Criteria.for<Task>().anyOf((c) => c.where('status').eq('a').limit(3)),
        CriteriaErrorCode.InvalidValue,
      );
    });
  });

  describe('immutability', () => {
    it('does not change earlier instances when building on them', () => {
      const base = Criteria.for<Task>().where('status').eq('open');
      const extended = base
        .where('priority')
        .gt(1)
        .orderBy('priority')
        .limit(5);
      const withOr = base.anyOf((c) => c.where('deletedAt').isNull());

      expect(base.toAst()).toEqual({
        filter: {
          kind: NodeKind.Group,
          operator: LogicalOperator.And,
          children: [
            {
              kind: NodeKind.Condition,
              field: 'status',
              operator: Operator.Eq,
              value: 'open',
            },
          ],
        },
        order: [],
      });
      expect(extended.toAst().filter.children).toHaveLength(2);
      expect(withOr.toAst().filter.children).toHaveLength(2);
    });

    it('returns copies, so mutating an AST does not change the builder', () => {
      const criteria = Criteria.for<Task>()
        .where('status')
        .eq('open')
        .orderBy('priority');
      const ast = criteria.toAst();
      ast.order.push({ field: 'id', direction: SortDirection.Desc });
      ast.filter.children.length = 0;
      const again = criteria.toAst();
      expect(again.order).toEqual([
        { field: 'priority', direction: SortDirection.Asc },
      ]);
      expect(again.filter.children).toHaveLength(1);
    });

    it('copies in-values so later changes to the input array do not leak in', () => {
      const values = ['a'];
      const criteria = Criteria.for<Task>().where('status').in(values);
      values.push('b');
      const [node] = criteria.toAst().filter.children;
      expect(node).toMatchObject({ value: ['a'] });
    });
  });

  describe('orderBy and limit', () => {
    it('defaults to ascending and keeps multiple terms in order', () => {
      const ast = Criteria.for<Task>()
        .orderBy('status')
        .orderBy('priority', SortDirection.Desc)
        .toAst();
      expect(ast.order).toEqual([
        { field: 'status', direction: SortDirection.Asc },
        { field: 'priority', direction: SortDirection.Desc },
      ]);
    });

    it('rejects an unknown direction', () => {
      expectCode(
        () => Criteria.for<Task>().orderBy('priority', 'up' as SortDirection),
        CriteriaErrorCode.InvalidValue,
      );
    });

    it.each([1, 50, 100])('accepts limit %p', (count) => {
      expect(Criteria.for<Task>().limit(count).toAst().limit).toBe(count);
    });

    it.each([0, -1, 101, 1.5, Number.NaN])(
      'rejects limit %p with InvalidLimit',
      (count) => {
        expectCode(
          () => Criteria.for<Task>().limit(count),
          CriteriaErrorCode.InvalidLimit,
        );
      },
    );
  });

  describe('after', () => {
    it('decodes a token produced by encodeCursor into the AST', () => {
      const token = encodeCursor({ values: [3], id: 'row-1' });
      expect(Criteria.for<Task>().after(token).toAst().after).toEqual({
        values: [3],
        id: 'row-1',
      });
    });

    it('rejects a malformed token with InvalidValue', () => {
      expectCode(
        () => Criteria.for<Task>().after('not a token!'),
        CriteriaErrorCode.InvalidValue,
      );
    });
  });

  describe('references', () => {
    it('is true for fields used by any condition, including inside OR groups', () => {
      const criteria = Criteria.for<Task>()
        .where('status')
        .eq('open')
        .anyOf((c) => c.where('tags').isNull());
      expect(criteria.references('status')).toBe(true);
      expect(criteria.references('tags')).toBe(true);
    });

    it('is false for fields that are only ordered or unused', () => {
      const criteria = Criteria.for<Task>()
        .where('status')
        .eq('open')
        .orderBy('priority');
      expect(criteria.references('priority')).toBe(false);
      expect(criteria.references('id')).toBe(false);
    });
  });

  describe('constrains', () => {
    it.each([
      ['eq', (c: Criteria<Task>) => c.where('status').eq('x')],
      ['in', (c: Criteria<Task>) => c.where('status').in(['x'])],
      ['gt', (c: Criteria<Task>) => c.where('status').gt('x')],
      ['gte', (c: Criteria<Task>) => c.where('status').gte('x')],
      ['lt', (c: Criteria<Task>) => c.where('status').lt('x')],
      ['lte', (c: Criteria<Task>) => c.where('status').lte('x')],
      ['between', (c: Criteria<Task>) => c.where('status').between('a', 'b')],
    ])('is true for a top-level %s', (_name, build) => {
      expect(build(Criteria.for<Task>()).constrains('status')).toBe(true);
    });

    it('is false for ne, isNull, isNotNull, like and notIn', () => {
      const base = Criteria.for<Task>();
      expect(base.where('status').ne('x').constrains('status')).toBe(false);
      expect(base.where('deletedAt').isNull().constrains('deletedAt')).toBe(
        false,
      );
      expect(base.where('deletedAt').isNotNull().constrains('deletedAt')).toBe(
        false,
      );
      expect(base.where('status').like('x%').constrains('status')).toBe(false);
      expect(base.where('status').notIn(['x']).constrains('status')).toBe(
        false,
      );
    });

    it('is true for an OR group only when every branch constrains the field', () => {
      const bounded = Criteria.for<Task>().anyOf(
        (c) => c.where('status').eq('a'),
        (c) => c.where('status').in(['b', 'c']).where('priority').gt(1),
      );
      expect(bounded.constrains('status')).toBe(true);

      const partial = Criteria.for<Task>().anyOf(
        (c) => c.where('status').eq('a'),
        (c) => c.where('priority').gt(1),
      );
      expect(partial.constrains('status')).toBe(false);
      expect(partial.references('status')).toBe(true);
    });

    it('does not count an unrelated field or an order term', () => {
      const criteria = Criteria.for<Task>()
        .where('priority')
        .eq(1)
        .orderBy('status');
      expect(criteria.constrains('status')).toBe(false);
      expect(criteria.constrains('priority')).toBe(true);
    });
  });

  describe('typed builder (compile-time checks)', () => {
    it('accepts valid calls on typed fields', () => {
      const criteria = Criteria.for<Task>()
        .where('status')
        .like('a%')
        .where('priority')
        .between(1, 3)
        .where('deletedAt')
        .eq(null)
        .where('deletedAt')
        .ne('2026-01-01')
        .where('tags')
        .eq('x');
      expect(criteria.toAst().filter.children).toHaveLength(5);
    });

    it('rejects unknown fields, wrong value types and like on non-string fields at compile time', () => {
      // Never invoked: the calls below only have to type-check. The @ts-expect-error lines fail the typecheck if they stop failing.
      const invalidCalls = (criteria: Criteria<Task>): void => {
        // @ts-expect-error unknown field
        criteria.where('nope');
        // @ts-expect-error number field does not take a string
        criteria.where('priority').eq('1');
        // @ts-expect-error like only applies to string fields
        criteria.where('priority').like('1%');
        // @ts-expect-error gt does not take null
        criteria.where('priority').gt(null);
        // @ts-expect-error eq(null) is only allowed when the field can be null
        criteria.where('status').eq(null);
        // @ts-expect-error in requires values of the field type
        criteria.where('status').in([1]);
        // @ts-expect-error orderBy requires a known field
        criteria.orderBy('nope');
        // @ts-expect-error references requires a known field
        criteria.references('nope');
      };
      expect(typeof invalidCalls).toBe('function');
    });

    it('defaults to a generic record entity', () => {
      const criteria = Criteria.for().where('anything').eq(1);
      expect(criteria.references('anything')).toBe(true);
    });
  });
});
