/** Comparison operators available to a condition. */
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

/** Kind discriminator for AST nodes. */
export enum NodeKind {
  Condition = 'condition',
  Group = 'group',
}

/** Sort direction for `orderBy`. */
export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc',
}

/** Logical operator joining the children of a group. */
export enum LogicalOperator {
  And = 'and',
  Or = 'or',
}

/** Codes carried by every `CriteriaError`. */
export enum CriteriaErrorCode {
  UnknownField = 'PLATFORM.CRITERIA.UNKNOWN_FIELD',
  InvalidValue = 'PLATFORM.CRITERIA.INVALID_VALUE',
  InvalidLimit = 'PLATFORM.CRITERIA.INVALID_LIMIT',
}
