/** Cómo se copian los datos de un tenant al destino (`TENANT_MOVE_STRATEGY`). */
export enum TenantMoveStrategy {
  /** Lotes por llave y rondas delta por `updated_at`; funciona en cualquier PostgreSQL. */
  Batch = 'batch',
  /** Publicación y suscripción de PostgreSQL; pide `wal_level=logical` y red del destino al origen. */
  LogicalReplication = 'logical-replication',
}
