/** Operadores de comparación que admite una condición. */
export enum Operator {
  Eq = 'eq',
  Ne = 'ne',
  Gt = 'gt',
  Gte = 'gte',
  Lt = 'lt',
  Lte = 'lte',
  In = 'in',
  NotIn = 'notIn',
  Like = 'like',
  ILike = 'ilike',
  IsNull = 'isNull',
  IsNotNull = 'isNotNull',
  Between = 'between',
}
