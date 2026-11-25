/** Converts between the domain aggregate and its TypeORM entity. Written by the service. */
export interface EntityMapper<TAggregate, TEntity> {
  toDomain(entity: TEntity): TAggregate;
  /** An entity without `version` is inserted; with `version` it is updated with optimistic locking. */
  toPersistence(aggregate: TAggregate): TEntity;
}
