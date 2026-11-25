import type { Cursor } from './cursor.js';
import type { LogicalOperator } from './logical-operator.enum.js';
import type { NodeKind } from './node-kind.enum.js';
import type { Operator } from './operator.enum.js';
import type { SortDirection } from './sort-direction.enum.js';

/** Leaf node: `field operator value`. `value` does not exist for `isNull` and `isNotNull`. */
export interface ConditionNode {
  readonly kind: NodeKind.Condition;
  readonly field: string;
  readonly operator: Operator;
  /**
   * `null` is only allowed with `eq` and `ne` (translated to IS NULL and IS NOT NULL).
   * For `between` it is an array `[from, to]`; for `in` and `notIn`, an array of non-null values.
   */
  readonly value?: unknown;
}

/** Internal node that joins its children with a logical operator. */
export interface GroupNode {
  readonly kind: NodeKind.Group;
  readonly operator: LogicalOperator;
  readonly children: CriteriaNode[];
}

/** Any node of the filter tree. */
export type CriteriaNode = ConditionNode | GroupNode;

/** A sort term. */
export interface OrderItem {
  readonly field: string;
  readonly direction: SortDirection;
}

/** Neutral description of a query, independent of the storage engine. */
export interface CriteriaAst {
  readonly filter: GroupNode;
  readonly order: OrderItem[];
  readonly limit?: number;
  readonly after?: Cursor;
}
