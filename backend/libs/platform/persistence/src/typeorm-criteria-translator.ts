import {
  CriteriaError,
  CriteriaErrorCode,
  CriteriaValidator,
  CursorCodec,
  LogicalOperator,
  NodeKind,
  Operator,
  PageBuilder,
  SortDirection,
  type ConditionNode,
  type CriteriaAst,
  type CriteriaNode,
  type Cursor,
  type OrderItem,
  type Page,
} from '@platform/criteria';
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import type { CriteriaFieldMap } from './criteria-field-map.js';

/** Una condición o un grupo ya traducido: su texto y si necesita paréntesis dentro de otra unión. */
interface Rendered {
  readonly sql: string;
  readonly compound: boolean;
}

/** Término de orden: la propiedad pedida, su columna calificada y la dirección. */
interface OrderTerm {
  readonly field: string;
  readonly column: string;
  readonly direction: SortDirection;
}

/** Todo lo que `apply` necesita, armado antes de tocar el `SelectQueryBuilder`. */
interface Compiled {
  readonly where: string | null;
  readonly params: Readonly<Record<string, unknown>>;
  readonly orderTerms: readonly OrderTerm[];
  readonly fetchLimit: number | null;
}

const LOGICAL_OPERATORS: ReadonlySet<unknown> = new Set<unknown>(
  Object.values(LogicalOperator),
);

/** Nombres de parámetro de una sola traducción: cada valor recibe uno nuevo y nunca entra al texto. */
class ParameterBag {
  private readonly values: Record<string, unknown> = {};
  private next = 0;

  bind(value: unknown): string {
    const name = `crit_${this.next}`;
    this.next += 1;
    this.values[name] = value;
    return `:${name}`;
  }

  toObject(): Readonly<Record<string, unknown>> {
    return { ...this.values };
  }
}

/**
 * Traduce el AST de `@platform/criteria` a un `SelectQueryBuilder` de TypeORM: filtro con parámetros,
 * orden y paginación por cursor (keyset) con desempate por id.
 */
export class TypeOrmCriteriaTranslator {
  constructor(private readonly fields: CriteriaFieldMap) {}

  /**
   * Agrega filtro, orden y `limit + 1` al constructor. Los valores van siempre como parámetros.
   * Si la traducción falla, el constructor queda intacto.
   * @throws CriteriaError `UnknownField` si el AST nombra un campo fuera de la lista blanca.
   */
  apply<TEntity extends ObjectLiteral>(
    qb: SelectQueryBuilder<TEntity>,
    ast: CriteriaAst,
  ): SelectQueryBuilder<TEntity> {
    const compiled = this.compile(ast);
    if (compiled.where !== null) {
      qb.andWhere(`(${compiled.where})`, compiled.params);
    }
    for (const term of compiled.orderTerms) {
      qb.addOrderBy(
        term.column,
        term.direction === SortDirection.Asc ? 'ASC' : 'DESC',
      );
    }
    if (compiled.fetchLimit !== null) {
      qb.limit(compiled.fetchLimit);
    }
    return qb;
  }

  /**
   * Aplica el límite original a las filas leídas con `limit + 1` y arma el cursor siguiente con el `codec` que
   * recibe. Sin `codec` usa uno sin firma.
   */
  toPage<TEntity extends ObjectLiteral>(
    rows: readonly TEntity[],
    ast: CriteriaAst,
    codec?: CursorCodec,
  ): Page<TEntity> {
    const sortFields = ast.order
      .map((item) => item.field)
      .filter((field) => field !== this.fields.idField);
    return new PageBuilder(codec ?? new CursorCodec()).build(
      rows,
      ast.limit,
      (row) => String(row[this.fields.idField]),
      (row) => sortFields.map((field) => this.cursorValueOf(row, field)),
    );
  }

  private compile(ast: CriteriaAst): Compiled {
    const params = new ParameterBag();
    const filter =
      ast.filter.children.length > 0
        ? this.renderNode(ast.filter, params)
        : null;

    const orderItems = ast.order.map((item) => this.orderTermOf(item));
    const idField = this.fields.idField;
    const idIndex = orderItems.findIndex((term) => term.field === idField);
    if (idIndex !== -1 && idIndex !== orderItems.length - 1) {
      throw this.invalid('the id must be the last orderBy term');
    }
    const valueTerms = idIndex === -1 ? orderItems : orderItems.slice(0, -1);
    const orderTerms =
      idIndex === -1
        ? [
            ...orderItems,
            {
              field: idField,
              column: this.idColumn(),
              direction:
                orderItems.length > 0
                  ? orderItems[orderItems.length - 1].direction
                  : SortDirection.Asc,
            },
          ]
        : orderItems;
    const tiebreak = orderTerms[orderTerms.length - 1];

    const cursorSql =
      ast.after === undefined
        ? null
        : this.keysetSql(ast.after, valueTerms, tiebreak, params);

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
      where: clauses.length === 0 ? null : clauses.join(' AND '),
      params: params.toObject(),
      orderTerms,
      fetchLimit: ast.limit === undefined ? null : this.fetchLimitOf(ast.limit),
    };
  }

  private renderNode(node: CriteriaNode, params: ParameterBag): Rendered {
    if (node.kind === NodeKind.Condition) {
      return { sql: this.conditionSql(node, params), compound: false };
    }
    const kind: unknown = node.kind;
    const operator: unknown = node.operator;
    if (kind !== NodeKind.Group || !LOGICAL_OPERATORS.has(operator)) {
      throw this.invalid('malformed criteria node');
    }
    const children = node.children;
    if (children.length === 0) {
      return {
        sql: node.operator === LogicalOperator.And ? 'TRUE' : 'FALSE',
        compound: false,
      };
    }
    if (children.length === 1) {
      return this.renderNode(children[0], params);
    }
    const separator = node.operator === LogicalOperator.And ? ' AND ' : ' OR ';
    const parts = children.map((child) => {
      const rendered = this.renderNode(child, params);
      return rendered.compound ? `(${rendered.sql})` : rendered.sql;
    });
    return { sql: parts.join(separator), compound: true };
  }

  private conditionSql(node: ConditionNode, params: ParameterBag): string {
    const column = this.column(node.field);
    const value: unknown = node.value;
    switch (node.operator) {
      case Operator.Eq:
        this.requireDefined(value);
        return value === null
          ? `${column} IS NULL`
          : `${column} = ${params.bind(value)}`;
      case Operator.Ne:
        this.requireDefined(value);
        return value === null
          ? `${column} IS NOT NULL`
          : `${column} IS DISTINCT FROM ${params.bind(value)}`;
      case Operator.Gt:
        this.requirePresent(value, 'gt value');
        return `${column} > ${params.bind(value)}`;
      case Operator.Gte:
        this.requirePresent(value, 'gte value');
        return `${column} >= ${params.bind(value)}`;
      case Operator.Lt:
        this.requirePresent(value, 'lt value');
        return `${column} < ${params.bind(value)}`;
      case Operator.Lte:
        this.requirePresent(value, 'lte value');
        return `${column} <= ${params.bind(value)}`;
      case Operator.In:
        return this.membershipSql(column, this.listOf(value), params, true);
      case Operator.NotIn:
        return this.membershipSql(column, this.listOf(value), params, false);
      case Operator.Like:
        if (typeof value !== 'string') {
          throw this.invalid('like pattern must be a string');
        }
        return `${column} LIKE ${params.bind(value)}`;
      case Operator.ILike:
        if (typeof value !== 'string') {
          throw this.invalid('ilike pattern must be a string');
        }
        return `${column} ILIKE ${params.bind(value)}`;
      case Operator.IsNull:
        return `${column} IS NULL`;
      case Operator.IsNotNull:
        return `${column} IS NOT NULL`;
      case Operator.Between:
        return this.betweenSql(column, value, params);
      default:
        throw this.invalid('unknown operator');
    }
  }

  private membershipSql(
    column: string,
    values: readonly unknown[],
    params: ParameterBag,
    inclusive: boolean,
  ): string {
    if (values.length === 0) {
      return inclusive ? 'FALSE' : 'TRUE';
    }
    const placeholders = values.map((value) => params.bind(value));
    return `${column} ${inclusive ? 'IN' : 'NOT IN'} (${placeholders.join(', ')})`;
  }

  private betweenSql(
    column: string,
    value: unknown,
    params: ParameterBag,
  ): string {
    if (!Array.isArray(value) || value.length !== 2) {
      throw this.invalid('between needs exactly two values');
    }
    const bounds: readonly unknown[] = value;
    const [from, to] = bounds;
    this.requirePresent(from, 'between lower bound');
    this.requirePresent(to, 'between upper bound');
    return `${column} BETWEEN ${params.bind(from)} AND ${params.bind(to)}`;
  }

  /**
   * Predicado de "estrictamente después del cursor" en el orden pedido. Direcciones iguales usan una
   * comparación de filas; mezcladas, la expansión en cadena de OR.
   */
  private keysetSql(
    cursor: Cursor,
    valueTerms: readonly OrderTerm[],
    tiebreak: OrderTerm,
    params: ParameterBag,
  ): string {
    if (cursor.values.length !== valueTerms.length) {
      throw this.invalid('cursor does not match the ordering');
    }
    for (const value of cursor.values) {
      this.requirePresent(value, 'cursor value');
    }
    const terms = [...valueTerms, tiebreak];
    const placeholders = [
      ...cursor.values.map((value) => params.bind(value)),
      params.bind(cursor.id),
    ];

    const uniform = terms.every(
      (term) => term.direction === terms[0].direction,
    );
    if (uniform) {
      const operator = terms[0].direction === SortDirection.Asc ? '>' : '<';
      const columns = terms.map((term) => term.column);
      if (columns.length === 1) {
        return `${columns[0]} ${operator} ${placeholders[0]}`;
      }
      return `(${columns.join(', ')}) ${operator} (${placeholders.join(', ')})`;
    }

    const branches = terms.map((term, index) => {
      const equalities = terms
        .slice(0, index)
        .map(
          (earlier, earlierIndex) =>
            `${earlier.column} = ${placeholders[earlierIndex]}`,
        );
      const operator = term.direction === SortDirection.Asc ? '>' : '<';
      return `(${[...equalities, `${term.column} ${operator} ${placeholders[index]}`].join(' AND ')})`;
    });
    return `(${branches.join(' OR ')})`;
  }

  private orderTermOf(item: OrderItem): OrderTerm {
    const column = this.column(item.field);
    if (
      item.direction !== SortDirection.Asc &&
      item.direction !== SortDirection.Desc
    ) {
      throw this.invalid('invalid sort direction');
    }
    return { field: item.field, column, direction: item.direction };
  }

  /** Propiedad de la lista blanca como `alias.propiedad`; TypeORM la traduce a la columna. */
  private column(field: string): string {
    if (!this.fields.properties.includes(field)) {
      throw new CriteriaError(
        CriteriaErrorCode.UnknownField,
        `unknown field: ${field}`,
      );
    }
    return `${this.fields.alias}.${field}`;
  }

  private idColumn(): string {
    return `${this.fields.alias}.${this.fields.idField}`;
  }

  private fetchLimitOf(limit: number): number {
    CriteriaValidator.limit(limit);
    return limit + 1;
  }

  private listOf(value: unknown): readonly unknown[] {
    if (!Array.isArray(value)) {
      throw this.invalid('expected an array of values');
    }
    const items: readonly unknown[] = value;
    for (const item of items) {
      this.requirePresent(item, 'list item');
    }
    return items;
  }

  private cursorValueOf(row: ObjectLiteral, field: string): unknown {
    const value: unknown = row[field];
    return value instanceof Date ? value.toISOString() : value;
  }

  /** Error de entrada inválida. El mensaje nunca lleva el valor recibido. */
  private invalid(message: string): CriteriaError {
    return new CriteriaError(CriteriaErrorCode.InvalidValue, message);
  }

  private requireDefined(value: unknown): void {
    if (value === undefined) {
      throw this.invalid('value must not be undefined');
    }
  }

  private requirePresent(value: unknown, what: string): void {
    if (value === undefined || value === null) {
      throw this.invalid(`${what} must not be null or undefined`);
    }
  }
}
