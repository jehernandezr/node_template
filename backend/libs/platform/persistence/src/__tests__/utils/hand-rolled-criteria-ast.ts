import {
  LogicalOperator,
  NodeKind,
  type ConditionNode,
  type CriteriaAst,
  type Operator,
  type SortDirection,
} from '@platform/criteria';

/**
 * AST armado a mano, sin `Criteria<Entity>`: sirve para nombrar campos que el tipo del criterio no
 * permitiría, como un nombre con SQL dentro, y comprobar que la lista blanca los rechaza.
 */
export class HandRolledCriteriaAst {
  /** Un grupo AND con una sola condición sobre `field`. */
  static conditionOn(
    field: string,
    operator: Operator,
    value?: unknown,
  ): CriteriaAst {
    const condition: ConditionNode =
      value === undefined
        ? { kind: NodeKind.Condition, field, operator }
        : { kind: NodeKind.Condition, field, operator, value };
    return {
      filter: {
        kind: NodeKind.Group,
        operator: LogicalOperator.And,
        children: [condition],
      },
      order: [],
    };
  }

  /** Sin filtro y con un solo término de orden sobre `field`. */
  static orderedBy(field: string, direction: SortDirection): CriteriaAst {
    return {
      filter: {
        kind: NodeKind.Group,
        operator: LogicalOperator.And,
        children: [],
      },
      order: [{ field, direction }],
    };
  }
}
