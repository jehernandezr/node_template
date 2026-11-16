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
  /** Términos del AND de nivel superior, en el orden en que se agregaron. */
  readonly conditions: readonly CriteriaNode[];
  readonly order: readonly OrderItem[];
  readonly limit?: number;
  readonly after?: Cursor;
}

/**
 * Constructor inmutable y encadenable de un filtro, un orden y la paginación por keyset.
 * Cada método devuelve una instancia nueva y deja intacta la original.
 */
export class Criteria<Entity extends object = Record<string, unknown>> {
  private static readonly EMPTY_STATE: CriteriaState = {
    conditions: [],
    order: [],
  };

  /** Operadores que acotan un campo a un valor, usados por `constrains`. */
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

  /** Crea un criterio vacío para `Entity`. */
  static for<
    Entity extends object = Record<string, unknown>,
  >(): Criteria<Entity> {
    return new Criteria<Entity>(Criteria.EMPTY_STATE);
  }

  /** Inicia una condición sobre `field`. Las llamadas consecutivas a `where` se unen con AND. */
  where<K extends FieldOf<Entity>>(field: K): WhereClause<Entity, K> {
    return new WhereClause<Entity, K>(field, (node: ConditionNode) =>
      this.withState({ conditions: [...this.state.conditions, node] }),
    );
  }

  /**
   * Agrega UN término a la lista AND: un grupo OR cuyas ramas son grupos AND.
   * Ejemplo: `where('deletedAt').isNull().anyOf(c => c.where('status').eq('open'), c => c.where('status').eq('pending'))`
   * produce `deleted IS NULL AND (open OR pending)`.
   * @throws CriteriaError `InvalidValue` si no hay ramas, una rama está vacía o una rama define orden, límite o cursor.
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

  /** Agrega un término de orden. Las llamadas sucesivas agregan órdenes secundarios. */
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
   * Fija el tamaño de página, de 1 a `MAX_LIMIT` (el `Pagination.maxLimit` del contrato).
   * @throws CriteriaError `InvalidLimit` si está fuera de rango.
   */
  limit(count: number): Criteria<Entity> {
    CriteriaValidator.limit(count);
    return this.withState({ limit: count });
  }

  /**
   * Continúa después de la posición que codifica `token`. El `codec` lo inyecta quien arma el servicio, con el mismo
   * secreto con el que se firmó el cursor.
   * @throws CriteriaError `InvalidValue` si el token está mal formado o su firma no coincide.
   */
  after(token: string, codec: CursorCodec): Criteria<Entity> {
    return this.withState({ after: codec.decode(token) });
  }

  /** Devuelve el AST neutral. Quien llama recibe copias y no puede cambiar el constructor. */
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
   * Es verdadero si alguna condición usa `field` en cualquier parte del filtro, incluidos los grupos OR.
   * Sirve para saber si el campo se filtra. Para saber si el filtro lo acota, usa `constrains`.
   */
  references<K extends FieldOf<Entity>>(field: K): boolean {
    return Criteria.mentionsField(this.state.conditions, field);
  }

  /**
   * Es verdadero si el filtro acota `field` con eq, in, gt, gte, lt, lte o between.
   * Cuenta las condiciones del camino AND de nivel superior y los grupos OR en los que toda rama acota el campo.
   * Sirve para exigir llaves de partición o alcances de tenant.
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
