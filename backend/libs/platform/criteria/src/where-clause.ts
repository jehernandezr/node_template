import type { ConditionNode } from './ast.js';
import type { Criteria } from './criteria.js';
import { CriteriaValidator } from './criteria-validator.js';
import { NodeKind } from './node-kind.enum.js';
import { Operator } from './operator.enum.js';

/** Names of an entity's properties, as strings. */
export type FieldOf<Entity> = keyof Entity & string;

/** Non-null type of a field. */
type Present<T> = NonNullable<T>;

/** `null` is only accepted when the field's type includes it. */
type NullIfNullable<T> = null extends T ? null : never;

/** Operator methods for a field. Each call returns a new `Criteria`. */
export class WhereClause<Entity extends object, K extends FieldOf<Entity>> {
  constructor(
    private readonly field: K,
    private readonly append: (node: ConditionNode) => Criteria<Entity>,
  ) {}

  /** The field equals `value`. `eq(null)` is equivalent to IS NULL and is only allowed if the field is nullable. */
  eq(value: Present<Entity[K]> | NullIfNullable<Entity[K]>): Criteria<Entity> {
    return this.add(Operator.Eq, value);
  }

  /** The field differs from `value`. `ne(null)` is equivalent to IS NOT NULL. Other values use IS DISTINCT FROM. */
  ne(value: Present<Entity[K]> | NullIfNullable<Entity[K]>): Criteria<Entity> {
    return this.add(Operator.Ne, value);
  }

  /** The field is greater than `value`. */
  gt(value: Present<Entity[K]>): Criteria<Entity> {
    CriteriaValidator.present(value, 'gt value');
    return this.add(Operator.Gt, value);
  }

  /** The field is greater than or equal to `value`. */
  gte(value: Present<Entity[K]>): Criteria<Entity> {
    CriteriaValidator.present(value, 'gte value');
    return this.add(Operator.Gte, value);
  }

  /** The field is less than `value`. */
  lt(value: Present<Entity[K]>): Criteria<Entity> {
    CriteriaValidator.present(value, 'lt value');
    return this.add(Operator.Lt, value);
  }

  /** The field is less than or equal to `value`. */
  lte(value: Present<Entity[K]>): Criteria<Entity> {
    CriteriaValidator.present(value, 'lte value');
    return this.add(Operator.Lte, value);
  }

  /** The field is in `values`. An empty list matches nothing. */
  in(values: readonly Present<Entity[K]>[]): Criteria<Entity> {
    return this.add(Operator.In, CriteriaValidator.list(values));
  }

  /** The field is not in `values`. An empty list matches everything. */
  notIn(values: readonly Present<Entity[K]>[]): Criteria<Entity> {
    return this.add(Operator.NotIn, CriteriaValidator.list(values));
  }

  /** The field matches the SQL `LIKE` pattern. Text fields only. The caller escapes wildcards with `escapeLike`. */
  like(
    pattern: Present<Entity[K]> extends string ? string : never,
  ): Criteria<Entity> {
    CriteriaValidator.text(pattern, 'like pattern');
    return this.add(Operator.Like, pattern);
  }

  /** Same as `like`, case-insensitive. Text fields only. */
  ilike(
    pattern: Present<Entity[K]> extends string ? string : never,
  ): Criteria<Entity> {
    CriteriaValidator.text(pattern, 'ilike pattern');
    return this.add(Operator.ILike, pattern);
  }

  /** The field is null. */
  isNull(): Criteria<Entity> {
    return this.add(Operator.IsNull);
  }

  /** The field is not null. */
  isNotNull(): Criteria<Entity> {
    return this.add(Operator.IsNotNull);
  }

  /** The field is between `from` and `to`, both inclusive. */
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
