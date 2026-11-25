/** Comparison operators a condition supports. */
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
