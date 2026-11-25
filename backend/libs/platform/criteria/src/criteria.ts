import type {
  ConditionNode,
  CriteriaAst,
  CriteriaNode,
  GroupNode,
  OrderItem,
} from './ast.js';
import { CriteriaValidator } from './criteria-validator.js';
import type { CursorCodec } from './cursor-codec.js';
import type { Cursor } from './cursor.js';
import { LogicalOperator } from './logical-operator.enum.js';
import { NodeKind } from './node-kind.enum.js';
import { Operator } from './operator.enum.js';
import { SortDirection } from './sort-direction.enum.js';
import { WhereClause, type FieldOf } from './where-clause.js';

interface CriteriaState {
  /** Terms of the top-level AND, in the order they were added. */
  readonly conditions: readonly CriteriaNode[];
  readonly order: readonly OrderItem[];
  readonly limit?: number;
  readonly after?: Cursor;
}

/**
 * Immutable, chainable builder of a filter, a sort order and keyset pagination.
 * Each method returns a new instance and leaves the original intact.
 */
export class Criteria<Entity extends object = Record<string, unknown>> {
  private static readonly EMPTY_STATE: CriteriaState = {
    conditions: [],
    order: [],
  };

  /** Operators that constrain a field to a value, used by `constrains`. */
  private static readonly CONSTRAINING: ReadonlySet<Operator> = new Set([
    Operator.Eq,
    Operator.In,
    Operator.Gt,
    Operator.Gte,
    Operator.Lt,
    Operator.Lte,
    Operator.Between,
  ]);

  private readonly state: CriteriaState;

  private constructor(state: CriteriaState) {
    this.state = state;
  }

  /** Creates an empty criteria for `Entity`. */
  static for<
    Entity extends object = Record<string, unknown>,
  >(): Criteria<Entity> {
    return new Criteria<Entity>(Criteria.EMPTY_STATE);
  }

  /** Starts a condition on `field`. Consecutive `where` calls are joined with AND. */
  where<K extends FieldOf<Entity>>(field: K): WhereClause<Entity, K> {
    return new WhereClause<Entity, K>(field, (node: ConditionNode) =>
      this.withState({ conditions: [...this.state.conditions, node] }),
    );
  }

  /**
   * Adds ONE term to the AND list: an OR group whose branches are AND groups.
   * Example: `where('deletedAt').isNull().anyOf(c => c.where('status').eq('open'), c => c.where('status').eq('pending'))`
   * produces `deleted IS NULL AND (open OR pending)`.
   * @throws CriteriaError `InvalidValue` if there are no branches, a branch is empty or a branch defines order, limit or cursor.
   */
  anyOf(
    ...branches: ((criteria: Criteria<Entity>) => Criteria<Entity>)[]
  ): Criteria<Entity> {
    if (branches.length === 0) {
      throw CriteriaValidator.invalid('anyOf needs at least one branch');
    }
    const alternatives = branches.map((build) => {
      const built = build(Criteria.for<Entity>()).state;
      if (
        built.order.length > 0 ||
        built.limit !== undefined ||
        built.after !== undefined
      ) {
        throw CriteriaValidator.invalid(
          'anyOf branches can only contain conditions',
        );
      }
      if (built.conditions.length === 0) {
        throw CriteriaValidator.invalid(
          'anyOf branch needs at least one condition',
        );
      }
      return Criteria.group(LogicalOperator.And, built.conditions);
    });
    return this.withState({
      conditions: [
        ...this.state.conditions,
        Criteria.group(LogicalOperator.Or, alternatives),
      ],
    });
  }

  /** Adds a sort term. Successive calls add secondary orders. */
  orderBy<K extends FieldOf<Entity>>(
    field: K,
    direction: SortDirection = SortDirection.Asc,
  ): Criteria<Entity> {
    if (!Object.values(SortDirection).includes(direction)) {
      throw CriteriaValidator.invalid('invalid sort direction');
    }
    return this.withState({
      order: [...this.state.order, Object.freeze({ field, direction })],
    });
  }

  /**
   * Sets the page size, from 1 to `MAX_LIMIT` (the contract's `Pagination.maxLimit`).
   * @throws CriteriaError `InvalidLimit` if out of range.
   */
  limit(count: number): Criteria<Entity> {
    CriteriaValidator.limit(count);
    return this.withState({ limit: count });
  }

  /**
   * Continues after the position encoded by `token`. The `codec` is injected by whoever assembles the service, with the same
   * secret the cursor was signed with.
   * @throws CriteriaError `InvalidValue` if the token is malformed or its signature does not match.
   */
  after(token: string, codec: CursorCodec): Criteria<Entity> {
    return this.withState({ after: codec.decode(token) });
  }

  /** Returns the neutral AST. The caller receives copies and cannot change the builder. */
  toAst(): CriteriaAst {
    const { limit, after } = this.state;
    return {
      filter: Criteria.group(LogicalOperator.And, this.state.conditions),
      order: [...this.state.order],
      ...(limit === undefined ? {} : { limit }),
      ...(after === undefined ? {} : { after }),
    };
  }

  /**
   * Returns whether any condition uses `field` anywhere in the filter, including OR groups.
   * Tells whether the field is filtered. To know whether the filter constrains it, use `constrains`.
   */
  references<K extends FieldOf<Entity>>(field: K): boolean {
    return Criteria.mentionsField(this.state.conditions, field);
  }

  /**
   * Returns whether the filter constrains `field` with eq, in, gt, gte, lt, lte or between.
   * Counts the conditions on the top-level AND path and the OR groups in which every branch constrains the field.
   * Used to require partition keys or tenant scopes.
   */
  constrains<K extends FieldOf<Entity>>(field: K): boolean {
    return this.state.conditions.some((node) =>
      Criteria.constrainsField(node, field),
    );
  }

  private withState(patch: Partial<CriteriaState>): Criteria<Entity> {
    return new Criteria<Entity>({ ...this.state, ...patch });
  }

  private static group(
    operator: LogicalOperator,
    children: readonly CriteriaNode[],
  ): GroupNode {
    return Object.freeze({
      kind: NodeKind.Group,
      operator,
      children: [...children],
    });
  }

  private static mentionsField(
    nodes: readonly CriteriaNode[],
    field: string,
  ): boolean {
    return nodes.some((node) =>
      node.kind === NodeKind.Condition
        ? node.field === field
        : Criteria.mentionsField(node.children, field),
    );
  }

  private static constrainsField(node: CriteriaNode, field: string): boolean {
    if (node.kind === NodeKind.Condition) {
      return node.field === field && Criteria.CONSTRAINING.has(node.operator);
    }
    if (node.operator === LogicalOperator.And) {
      return node.children.some((child) =>
        Criteria.constrainsField(child, field),
      );
    }
    return (
      node.children.length > 0 &&
      node.children.every((child) => Criteria.constrainsField(child, field))
    );
  }
}
