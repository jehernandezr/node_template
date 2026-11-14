/**
 * Estrategia de enrutamiento declarativa de un módulo, como en
 * `PersistenceModule.forFeature({ sharding: { strategy: ShardStrategy.Directory, key: ShardKey.User } })`.
 */
export enum ShardStrategy {
  /**
   * Por defecto. El directorio del catálogo asigna tenant, región y grupo de
   * shards; un grupo con más de un shard se divide por hash consistente de la
   * clave de enrutamiento (`ConsistentHashStrategy`). Permite mover tenants.
   */
  Directory = 'directory',
  /** Anillo con nodos virtuales sobre el grupo (`ConsistentHashStrategy`). Muchas claves pequeñas. */
  ConsistentHash = 'consistent-hash',
  /** Rangos ordenados de claves (`RangeShardStrategy`). Claves con orden natural, como fechas. */
  Range = 'range',
}
