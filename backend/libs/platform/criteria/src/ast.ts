import type { Cursor } from './cursor.js';
import type { LogicalOperator } from './logical-operator.enum.js';
import type { NodeKind } from './node-kind.enum.js';
import type { Operator } from './operator.enum.js';
import type { SortDirection } from './sort-direction.enum.js';

/** Nodo hoja: `campo operador valor`. `value` no existe para `isNull` e `isNotNull`. */
export interface ConditionNode {
  readonly kind: NodeKind.Condition;
  readonly field: string;
  readonly operator: Operator;
  /**
   * `null` solo se admite con `eq` y `ne` (se traduce a IS NULL e IS NOT NULL).
   * Para `between` es un arreglo `[desde, hasta]`; para `in` y `notIn`, un arreglo de valores no nulos.
   */
  readonly value?: unknown;
}

/** Nodo interno que une sus hijos con un operador lógico. */
export interface GroupNode {
  readonly kind: NodeKind.Group;
  readonly operator: LogicalOperator;
  readonly children: CriteriaNode[];
}

/** Cualquier nodo del árbol de filtro. */
export type CriteriaNode = ConditionNode | GroupNode;

/** Un término de orden. */
export interface OrderItem {
  readonly field: string;
  readonly direction: SortDirection;
}

/** Descripción neutral de una consulta, independiente del motor de almacenamiento. */
export interface CriteriaAst {
  readonly filter: GroupNode;
  readonly order: OrderItem[];
  readonly limit?: number;
  readonly after?: Cursor;
}
