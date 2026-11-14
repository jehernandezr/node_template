import type {
  ConditionNode,
  CriteriaAst,
  CriteriaNode,
  GroupNode,
} from './ast.js';
import type { Cursor } from './cursor.js';
import {
  CriteriaErrorCode,
  LogicalOperator,
  NodeKind,
  Operator,
  SortDirection,
} from './enums.js';
import { CriteriaError } from './errors.js';
import {
  assertIdentifier,
  assertLimit,
  assertPresent,
  assertText,
  invalid,
  listOf,
} from './validation.js';

/** Options for {@link toSql}. `bind` returns the placeholder for a value, so callers choose `$n`, `:name` or similar. */
export interface SqlOptions {
  /** Field name to column name. Only listed fields can be filtered or ordered. */
  readonly columns: Readonly<Record<string, string>>;
  /** Column used for the keyset cursor and as tiebreaker. Defaults to `id`. */
  readonly idColumn?: string;
  /** Table alias. When set, columns render as `"alias"."column"`. */
  readonly alias?: string;
  /** Registers a value and returns its placeholder. Values never appear in the SQL text. */
  readonly bind: (value: unknown) => string;
}

/** SQL fragments produced by {@link toSql}. */
export interface SqlFragments {
  /** Boolean expression, `TRUE` when empty. Includes the keyset condition. */
  readonly where: string;
  /** Comma-separated ORDER BY terms. The id is last, as tiebreaker. */
  readonly orderBy: string;
  /** `limit + 1`, so the caller can detect a next page. `null` when there is no limit. */
  readonly fetchLimit: number | null;
}

interface Rendered {
  readonly sql: string;
  /** True when the SQL is a join of several terms and needs parentheses inside another join. */
  readonly compound: boolean;
}

const LOGICAL_OPERATORS = new Set<string>(Object.values(LogicalOperator));

function quoteColumn(alias: string | undefined, column: string): string {
  return alias === undefined ? `"${column}"` : `"${alias}"."${column}"`;
}

/**
 * Renders a criteria AST as SQL through a caller-supplied `bind` function (AST visitor).
 * @throws CriteriaError with `UnknownField` for fields missing from `columns`, `InvalidValue` for malformed input or identifiers, `InvalidLimit` for a bad limit.
 */
export function toSql(ast: CriteriaAst, options: SqlOptions): SqlFragments {
  const { columns, alias, bind } = options;
  const idColumn = options.idColumn ?? 'id';
  if (alias !== undefined) {
    assertIdentifier(alias, 'alias');
  }
  assertIdentifier(idColumn, 'id column');
  for (const column of Object.values(columns)) {
    assertIdentifier(column, 'column');
  }
  const idRef = quoteColumn(alias, idColumn);

  const columnOf = (field: string): string => {
    if (!Object.hasOwn(columns, field)) {
      throw new CriteriaError(
        CriteriaErrorCode.UnknownField,
        `unknown field: ${field}`,
      );
    }
    return quoteColumn(alias, columns[field]);
  };

  const conditionSql = (node: ConditionNode): string => {
    const column = columnOf(node.field);
    const value = node.value;
    switch (node.operator) {
      case Operator.Eq:
        assertDefinedValue(value);
        return value === null
          ? `${column} IS NULL`
          : `${column} = ${bind(value)}`;
      case Operator.Ne:
        assertDefinedValue(value);
        return value === null
          ? `${column} IS NOT NULL`
          : `${column} IS DISTINCT FROM ${bind(value)}`;
      case Operator.Gt:
        assertPresent(value, 'value');
        return `${column} > ${bind(value)}`;
      case Operator.Gte:
        assertPresent(value, 'value');
        return `${column} >= ${bind(value)}`;
      case Operator.Lt:
        assertPresent(value, 'value');
        return `${column} < ${bind(value)}`;
      case Operator.Lte:
        assertPresent(value, 'value');
        return `${column} <= ${bind(value)}`;
      case Operator.In: {
        const values = listOf(value);
        return values.length === 0
          ? 'FALSE'
          : `${column} IN (${values.map((v) => bind(v)).join(', ')})`;
      }
      case Operator.NotIn: {
        const values = listOf(value);
        return values.length === 0
          ? 'TRUE'
          : `${column} NOT IN (${values.map((v) => bind(v)).join(', ')})`;
      }
      case Operator.Like:
        assertText(value, 'like pattern');
        return `${column} LIKE ${bind(value)}`;
      case Operator.ILike:
        assertText(value, 'ilike pattern');
        return `${column} ILIKE ${bind(value)}`;
      case Operator.IsNull:
        return `${column} IS NULL`;
      case Operator.IsNotNull:
        return `${column} IS NOT NULL`;
      case Operator.Between: {
        if (!Array.isArray(value) || value.length !== 2) {
          throw invalid('between needs exactly two values');
        }
        const [from, to] = value as unknown[];
        assertPresent(from, 'between lower bound');
        assertPresent(to, 'between upper bound');
        return `${column} BETWEEN ${bind(from)} AND ${bind(to)}`;
      }
      default:
        throw invalid('unknown operator');
    }
  };

  const renderNode = (node: CriteriaNode): Rendered => {
    const kind: unknown = node.kind;
    if (kind === NodeKind.Condition) {
      return { sql: conditionSql(node as ConditionNode), compound: false };
    }
    const group = node as GroupNode;
    if (kind !== NodeKind.Group || !LOGICAL_OPERATORS.has(group.operator)) {
      throw invalid('malformed criteria node');
    }
    const children = group.children;
    if (children.length === 0) {
      return {
        sql: group.operator === LogicalOperator.And ? 'TRUE' : 'FALSE',
        compound: false,
      };
    }
    if (children.length === 1) {
      return renderNode(children[0]);
    }
    const separator = group.operator === LogicalOperator.And ? ' AND ' : ' OR ';
    const parts = children.map((child) => {
      const rendered = renderNode(child);
      return rendered.compound ? `(${rendered.sql})` : rendered.sql;
    });
    return { sql: parts.join(separator), compound: true };
  };

  // Filter first, then cursor: placeholders are bound in textual order.
  const filter = ast.filter.children.length > 0 ? renderNode(ast.filter) : null;

  const orderItems = ast.order.map((item) => {
    const column = columnOf(item.field);
    if (
      item.direction !== SortDirection.Asc &&
      item.direction !== SortDirection.Desc
    ) {
      throw invalid('invalid sort direction');
    }
    return { column, direction: item.direction };
  });
  const idIndex = orderItems.findIndex((item) => item.column === idRef);
  if (idIndex !== -1 && idIndex !== orderItems.length - 1) {
    throw invalid('the id must be the last orderBy term');
  }
  const valueKeys = idIndex === -1 ? orderItems : orderItems.slice(0, -1);
  const tiebreak =
    idIndex !== -1
      ? orderItems[idIndex]
      : {
          column: idRef,
          direction:
            orderItems.length > 0
              ? orderItems[orderItems.length - 1].direction
              : SortDirection.Asc,
        };

  const orderParts = orderItems.map(
    (item) =>
      `${item.column} ${item.direction === SortDirection.Asc ? 'ASC' : 'DESC'}`,
  );
  if (idIndex === -1) {
    orderParts.push(
      `${tiebreak.column} ${tiebreak.direction === SortDirection.Asc ? 'ASC' : 'DESC'}`,
    );
  }

  /**
   * Keyset predicate for "strictly after the cursor row" in the ordering.
   * Uniform directions use a row comparison. Mixed directions use the expanded OR chain.
   */
  const keysetSql = (cursor: Cursor): string => {
    if (cursor.values.length !== valueKeys.length) {
      throw invalid('cursor does not match the ordering');
    }
    for (const value of cursor.values) {
      assertPresent(value, 'cursor value');
    }
    const columns = [...valueKeys.map((key) => key.column), tiebreak.column];
    const directions = [
      ...valueKeys.map((key) => key.direction),
      tiebreak.direction,
    ];
    const placeholders = [
      ...cursor.values.map((value) => bind(value)),
      bind(cursor.id),
    ];

    if (directions.every((direction) => direction === directions[0])) {
      const operator = directions[0] === SortDirection.Asc ? '>' : '<';
      if (columns.length === 1) {
        return `${columns[0]} ${operator} ${placeholders[0]}`;
      }
      return `(${columns.join(', ')}) ${operator} (${placeholders.join(', ')})`;
    }

    const branches = columns.map((column, index) => {
      const equalities = columns
        .slice(0, index)
        .map(
          (earlier, earlierIndex) =>
            `${earlier} = ${placeholders[earlierIndex]}`,
        );
      const operator = directions[index] === SortDirection.Asc ? '>' : '<';
      return `(${[...equalities, `${column} ${operator} ${placeholders[index]}`].join(' AND ')})`;
    });
    return `(${branches.join(' OR ')})`;
  };

  const cursorSql = ast.after === undefined ? null : keysetSql(ast.after);

  const clauses: string[] = [];
  if (filter !== null) {
    clauses.push(
      filter.compound && cursorSql !== null ? `(${filter.sql})` : filter.sql,
    );
  }
  if (cursorSql !== null) {
    clauses.push(cursorSql);
  }

  return {
    where: clauses.length === 0 ? 'TRUE' : clauses.join(' AND '),
    orderBy: orderParts.join(', '),
    fetchLimit: ast.limit === undefined ? null : fetchLimitOf(ast.limit),
  };
}

function assertDefinedValue(value: unknown): void {
  if (value === undefined) {
    throw invalid('value must not be undefined');
  }
}

function fetchLimitOf(limit: number): number {
  assertLimit(limit);
  return limit + 1;
}
