import type {
  ConditionNode,
  CriteriaAst,
  CriteriaNode,
  GroupNode,
  OrderItem,
} from './ast.js';
import { decodeCursor, type Cursor } from './cursor.js';
import { LogicalOperator, NodeKind, Operator, SortDirection } from './enums.js';
import {
  assertDefined,
  assertLimit,
  assertPresent,
  assertText,
  invalid,
  listOf,
} from './validation.js';

/** Field names of an entity, as strings. */
export type FieldOf<Entity> = keyof Entity & string;

/** The non-null value type of a field. */
type Present<T> = NonNullable<T>;

/** `null` is accepted only when the field type includes null. */
type NullIfNullable<T> = null extends T ? null : never;

interface CriteriaState {
  /** Top-level AND terms, in insertion order. */
  readonly conditions: readonly CriteriaNode[];
  readonly order: readonly OrderItem[];
  readonly limit?: number;
  readonly after?: Cursor;
}

const EMPTY_STATE: CriteriaState = { conditions: [], order: [] };

/** Operators that bound a field to a value, used by `constrains`. */
const CONSTRAINING = new Set<Operator>([
  Operator.Eq,
  Operator.In,
  Operator.Gt,
  Operator.Gte,
  Operator.Lt,
  Operator.Lte,
  Operator.Between,
]);

function group(
  operator: LogicalOperator,
  children: readonly CriteriaNode[],
): GroupNode {
  return Object.freeze({
    kind: NodeKind.Group,
    operator,
    children: [...children],
  });
}

function mentionsField(nodes: readonly CriteriaNode[], field: string): boolean {
  return nodes.some((node) =>
    node.kind === NodeKind.Condition
      ? node.field === field
      : mentionsField(node.children, field),
  );
}

function constrainsField(node: CriteriaNode, field: string): boolean {
  if (node.kind === NodeKind.Condition) {
    return node.field === field && CONSTRAINING.has(node.operator);
  }
  if (node.operator === LogicalOperator.And) {
    return node.children.some((child) => constrainsField(child, field));
  }
  return (
    node.children.length > 0 &&
    node.children.every((child) => constrainsField(child, field))
  );
}

/** Operator methods for one field. Each call returns a new `Criteria`. */
export class WhereClause<Entity extends object, K extends FieldOf<Entity>> {
  constructor(
    private readonly field: K,
    private readonly append: (node: ConditionNode) => Criteria<Entity>,
  ) {}

  /** Field equals `value`. `eq(null)` means IS NULL and is only allowed when the field can be null. */
  eq(value: Present<Entity[K]> | NullIfNullable<Entity[K]>): Criteria<Entity> {
    return this.add(Operator.Eq, value);
  }

  /** Field differs from `value`. `ne(null)` means IS NOT NULL. Other values use IS DISTINCT FROM. */
  ne(value: Present<Entity[K]> | NullIfNullable<Entity[K]>): Criteria<Entity> {
    return this.add(Operator.Ne, value);
  }

  /** Field is greater than `value`. */
  gt(value: Present<Entity[K]>): Criteria<Entity> {
    assertPresent(value, 'gt value');
    return this.add(Operator.Gt, value);
  }

  /** Field is greater than or equal to `value`. */
  gte(value: Present<Entity[K]>): Criteria<Entity> {
    assertPresent(value, 'gte value');
    return this.add(Operator.Gte, value);
  }

  /** Field is less than `value`. */
  lt(value: Present<Entity[K]>): Criteria<Entity> {
    assertPresent(value, 'lt value');
    return this.add(Operator.Lt, value);
  }

  /** Field is less than or equal to `value`. */
  lte(value: Present<Entity[K]>): Criteria<Entity> {
    assertPresent(value, 'lte value');
    return this.add(Operator.Lte, value);
  }

  /** Field is one of `values`. An empty list matches nothing. */
  in(values: readonly Present<Entity[K]>[]): Criteria<Entity> {
    return this.add(Operator.In, listOf(values));
  }

  /** Field is none of `values`. An empty list matches everything. */
  notIn(values: readonly Present<Entity[K]>[]): Criteria<Entity> {
    return this.add(Operator.NotIn, listOf(values));
  }

  /** Field matches the SQL `LIKE` pattern. Only for string fields. Callers escape wildcards with `escapeLike`. */
  like(
    pattern: Present<Entity[K]> extends string ? string : never,
  ): Criteria<Entity> {
    assertText(pattern, 'like pattern');
    return this.add(Operator.Like, pattern);
  }

  /** Case-insensitive `LIKE` pattern. Only for string fields. Callers escape wildcards with `escapeLike`. */
  ilike(
    pattern: Present<Entity[K]> extends string ? string : never,
  ): Criteria<Entity> {
    assertText(pattern, 'ilike pattern');
    return this.add(Operator.ILike, pattern);
  }

  /** Field is null. */
  isNull(): Criteria<Entity> {
    return this.add(Operator.IsNull);
  }

  /** Field is not null. */
  isNotNull(): Criteria<Entity> {
    return this.add(Operator.IsNotNull);
  }

  /** Field is between `from` and `to`, inclusive. */
  between(from: Present<Entity[K]>, to: Present<Entity[K]>): Criteria<Entity> {
    assertPresent(from, 'between lower bound');
    assertPresent(to, 'between upper bound');
    return this.add(Operator.Between, Object.freeze([from, to]));
  }

  private add(operator: Operator, ...value: [] | [unknown]): Criteria<Entity> {
    if (value.length === 1) {
      assertDefined(value[0], 'value');
    }
    const node: ConditionNode =
      value.length === 0
        ? { kind: NodeKind.Condition, field: this.field, operator }
        : {
            kind: NodeKind.Condition,
            field: this.field,
            operator,
            value: value[0],
          };
    return this.append(Object.freeze(node));
  }
}

/**
 * Immutable fluent builder for a query filter, ordering and keyset pagination.
 * Every method returns a new instance and leaves the receiver unchanged.
 */
export class Criteria<Entity extends object = Record<string, unknown>> {
  private readonly state: CriteriaState;

  private constructor(state: CriteriaState) {
    this.state = state;
  }

  /** Starts an empty criteria for `Entity`. */
  static for<
    Entity extends object = Record<string, unknown>,
  >(): Criteria<Entity> {
    return new Criteria<Entity>(EMPTY_STATE);
  }

  /** Starts a condition on `field`. Consecutive `where` calls are joined with AND. */
  where<K extends FieldOf<Entity>>(field: K): WhereClause<Entity, K> {
    return new WhereClause<Entity, K>(field, (node) =>
      this.withState({ conditions: [...this.state.conditions, node] }),
    );
  }

  /**
   * Adds ONE term to the AND list: an OR group whose branches are AND groups.
   * Example: `where('deletedAt').isNull().anyOf(c => c.where('status').eq('open'), c => c.where('status').eq('pending'))`
   * gives `deleted IS NULL AND (open OR pending)`.
   * @throws CriteriaError with `InvalidValue` when there are no branches, a branch is empty, or a branch sets order, limit or cursor.
   */
  anyOf(
    ...branches: ((criteria: Criteria<Entity>) => Criteria<Entity>)[]
  ): Criteria<Entity> {
    if (branches.length === 0) {
      throw invalid('anyOf needs at least one branch');
    }
    const alternatives = branches.map((build) => {
      const built = build(Criteria.for<Entity>()).state;
      if (
        built.order.length > 0 ||
        built.limit !== undefined ||
        built.after !== undefined
      ) {
        throw invalid('anyOf branches can only contain conditions');
      }
      if (built.conditions.length === 0) {
        throw invalid('anyOf branch needs at least one condition');
      }
      return group(LogicalOperator.And, built.conditions);
    });
    return this.withState({
      conditions: [
        ...this.state.conditions,
        group(LogicalOperator.Or, alternatives),
      ],
    });
  }

  /** Adds an ordering term. Multiple calls add secondary orderings. */
  orderBy<K extends FieldOf<Entity>>(
    field: K,
    direction: SortDirection = SortDirection.Asc,
  ): Criteria<Entity> {
    if (!Object.values(SortDirection).includes(direction)) {
      throw invalid('invalid sort direction');
    }
    return this.withState({
      order: [...this.state.order, Object.freeze({ field, direction })],
    });
  }

  /**
   * Sets the page size, from 1 to 1000.
   * @throws CriteriaError with `InvalidLimit` when out of range.
   */
  limit(count: number): Criteria<Entity> {
    assertLimit(count);
    return this.withState({ limit: count });
  }

  /**
   * Continues after the position encoded in `token` (see `encodeCursor` and `takePage`).
   * @throws CriteriaError with `InvalidValue` when the token is malformed.
   */
  after(token: string): Criteria<Entity> {
    return this.withState({ after: decodeCursor(token) });
  }

  /** Returns the neutral AST. Callers receive copies and cannot change the builder. */
  toAst(): CriteriaAst {
    const { limit, after } = this.state;
    return {
      filter: group(LogicalOperator.And, this.state.conditions),
      order: [...this.state.order],
      ...(limit === undefined ? {} : { limit }),
      ...(after === undefined ? {} : { after }),
    };
  }

  /**
   * True when any condition uses `field`, anywhere in the filter, including inside OR groups.
   * Use it for "is this field filtered at all" checks. Use `constrains` to ask whether the filter bounds the field.
   */
  references<K extends FieldOf<Entity>>(field: K): boolean {
    return mentionsField(this.state.conditions, field);
  }

  /**
   * True when the filter bounds `field` with eq, in, gt, gte, lt, lte or between.
   * Counts conditions on the top-level AND path, and OR groups where every branch constrains the field.
   * Use it to enforce partition keys or tenant scopes.
   */
  constrains<K extends FieldOf<Entity>>(field: K): boolean {
    return this.state.conditions.some((node) => constrainsField(node, field));
  }

  private withState(patch: Partial<CriteriaState>): Criteria<Entity> {
    return new Criteria<Entity>({ ...this.state, ...patch });
  }
}
