/**
 * Session variables that the layer sets with `set_config(..., true)` when opening each
 * transaction. Audit triggers and RLS policies read them with
 * `current_setting(name, true)`. They are valid only inside the transaction.
 */
export enum SessionSetting {
  ActorId = 'app.actor_id',
  ActorType = 'app.actor_type',
  TenantId = 'app.tenant_id',
  TraceId = 'app.trace_id',
  /** `on` in the transaction of a maintenance task that walks all tenants of a shard. */
  Maintenance = 'app.maintenance',
}

/** Operation recorded in `audit_log`. Matches Postgres `TG_OP`. */
export enum AuditOperation {
  Insert = 'INSERT',
  Update = 'UPDATE',
  Delete = 'DELETE',
}

/** Way to partition a table. */
export enum PartitionBy {
  Range = 'range',
  List = 'list',
  Hash = 'hash',
}

/** Interval of a range partition. */
export enum PartitionInterval {
  Day = 'day',
  Month = 'month',
}
