import {
  LogicalOperator,
  NodeKind,
  type ConditionNode,
  type CriteriaAst,
  type Operator,
  type SortDirection,
} from '@platform/criteria';

/**
 * Hand-built AST, without `Criteria<Entity>`: used to name fields that the criteria type would not
 * allow, such as a name with SQL inside, and check that the allowlist rejects them.
 */
export class HandRolledCriteriaAst {
  /** An AND group with a single condition on `field`. */
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

  /** No filter and a single sort term on `field`. */
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
