import type { Cursor } from './cursor.js';
import type {
  LogicalOperator,
  NodeKind,
  Operator,
  SortDirection,
} from './enums.js';

/** Leaf node: `field operator value`. `value` is absent for `isNull` and `isNotNull`. */
export interface ConditionNode {
  readonly kind: NodeKind.Condition;
  readonly field: string;
  readonly operator: Operator;
  /**
   * `null` is allowed only for `eq` and `ne` (rendered as IS NULL / IS NOT NULL).
   * Array `[from, to]` for `between`, array of non-null values for `in` and `notIn`.
   */
  readonly value?: unknown;
}

/** Inner node joining its children with one logical operator. */
export interface GroupNode {
  readonly kind: NodeKind.Group;
  readonly operator: LogicalOperator;
  readonly children: CriteriaNode[];
}

/** Any node of the criteria filter tree. */
export type CriteriaNode = ConditionNode | GroupNode;

/** One ordering term. */
export interface OrderItem {
  readonly field: string;
  readonly direction: SortDirection;
}

/** Neutral description of a query, independent of any storage engine. */
export interface CriteriaAst {
  readonly filter: GroupNode;
  readonly order: OrderItem[];
  readonly limit?: number;
  readonly after?: Cursor;
}
