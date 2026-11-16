import type { ConditionNode } from './ast.js';
import type { Criteria } from './criteria.js';
import { CriteriaValidator } from './criteria-validator.js';
import { NodeKind } from './node-kind.enum.js';
import { Operator } from './operator.enum.js';

/** Nombres de las propiedades de una entidad, como cadenas. */
export type FieldOf<Entity> = keyof Entity & string;

/** Tipo no nulo de un campo. */
type Present<T> = NonNullable<T>;

/** `null` solo se acepta cuando el tipo del campo lo incluye. */
type NullIfNullable<T> = null extends T ? null : never;

/** Métodos de operador para un campo. Cada llamada devuelve un `Criteria` nuevo. */
export class WhereClause<Entity extends object, K extends FieldOf<Entity>> {
  constructor(
    private readonly field: K,
    private readonly append: (node: ConditionNode) => Criteria<Entity>,
  ) {}

  /** El campo es igual a `value`. `eq(null)` equivale a IS NULL y solo se admite si el campo puede ser nulo. */
  eq(value: Present<Entity[K]> | NullIfNullable<Entity[K]>): Criteria<Entity> {
    return this.add(Operator.Eq, value);
  }

  /** El campo es distinto de `value`. `ne(null)` equivale a IS NOT NULL. Los demás valores usan IS DISTINCT FROM. */
  ne(value: Present<Entity[K]> | NullIfNullable<Entity[K]>): Criteria<Entity> {
    return this.add(Operator.Ne, value);
  }

  /** El campo es mayor que `value`. */
  gt(value: Present<Entity[K]>): Criteria<Entity> {
    CriteriaValidator.present(value, 'gt value');
    return this.add(Operator.Gt, value);
  }

  /** El campo es mayor o igual que `value`. */
  gte(value: Present<Entity[K]>): Criteria<Entity> {
    CriteriaValidator.present(value, 'gte value');
    return this.add(Operator.Gte, value);
  }

  /** El campo es menor que `value`. */
  lt(value: Present<Entity[K]>): Criteria<Entity> {
    CriteriaValidator.present(value, 'lt value');
    return this.add(Operator.Lt, value);
  }

  /** El campo es menor o igual que `value`. */
  lte(value: Present<Entity[K]>): Criteria<Entity> {
    CriteriaValidator.present(value, 'lte value');
    return this.add(Operator.Lte, value);
  }

  /** El campo está en `values`. Una lista vacía no coincide con nada. */
  in(values: readonly Present<Entity[K]>[]): Criteria<Entity> {
    return this.add(Operator.In, CriteriaValidator.list(values));
  }

  /** El campo no está en `values`. Una lista vacía coincide con todo. */
  notIn(values: readonly Present<Entity[K]>[]): Criteria<Entity> {
    return this.add(Operator.NotIn, CriteriaValidator.list(values));
  }

  /** El campo cumple el patrón `LIKE` de SQL. Solo para campos de texto. Quien llama escapa los comodines con `escapeLike`. */
  like(
    pattern: Present<Entity[K]> extends string ? string : never,
  ): Criteria<Entity> {
    CriteriaValidator.text(pattern, 'like pattern');
    return this.add(Operator.Like, pattern);
  }

  /** Igual que `like`, sin distinguir mayúsculas. Solo para campos de texto. */
  ilike(
    pattern: Present<Entity[K]> extends string ? string : never,
  ): Criteria<Entity> {
    CriteriaValidator.text(pattern, 'ilike pattern');
    return this.add(Operator.ILike, pattern);
  }

  /** El campo es nulo. */
  isNull(): Criteria<Entity> {
    return this.add(Operator.IsNull);
  }

  /** El campo no es nulo. */
  isNotNull(): Criteria<Entity> {
    return this.add(Operator.IsNotNull);
  }

  /** El campo está entre `from` y `to`, ambos incluidos. */
  between(from: Present<Entity[K]>, to: Present<Entity[K]>): Criteria<Entity> {
    CriteriaValidator.present(from, 'between lower bound');
    CriteriaValidator.present(to, 'between upper bound');
    return this.add(Operator.Between, Object.freeze([from, to]));
  }

  private add(operator: Operator, ...value: [] | [unknown]): Criteria<Entity> {
    if (value.length === 1) {
      CriteriaValidator.defined(value[0], 'value');
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
