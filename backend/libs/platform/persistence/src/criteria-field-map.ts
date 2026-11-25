/**
 * The fields of an entity that a criteria can filter or sort by. Any other name is rejected,
 * so a value coming from outside never reaches the statement as an identifier.
 */
export class CriteriaFieldMap {
  /** @param alias alias of the entity in the `SelectQueryBuilder`. @param properties allowed property names. @param idField pagination tie-breaker property, `id` by default. */
  constructor(
    readonly alias: string,
    readonly properties: readonly string[],
    readonly idField = 'id',
  ) {}
}
