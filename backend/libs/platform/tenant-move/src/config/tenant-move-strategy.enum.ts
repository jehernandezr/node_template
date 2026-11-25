/** How a tenant's data is copied to the target (`TENANT_MOVE_STRATEGY`). */
export enum TenantMoveStrategy {
  /** Batches by key and delta rounds by `updated_at`; works on any PostgreSQL. */
  Batch = 'batch',
  /** PostgreSQL publication and subscription; requires `wal_level=logical` and network from the target to the source. */
  LogicalReplication = 'logical-replication',
}
