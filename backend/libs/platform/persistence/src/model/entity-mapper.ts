/** Convierte entre el agregado del dominio y su entidad de TypeORM. Lo escribe el servicio. */
export interface EntityMapper<TAggregate, TEntity> {
  toDomain(entity: TEntity): TAggregate;
  /** Una entidad sin `version` se inserta; con `version` se actualiza con bloqueo optimista. */
  toPersistence(aggregate: TAggregate): TEntity;
}
