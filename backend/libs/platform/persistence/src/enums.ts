/**
 * Variables de sesión que la capa fija con `set_config(..., true)` al abrir cada
 * transacción. Los triggers de auditoría y las políticas de RLS las leen con
 * `current_setting(nombre, true)`. Valen solo dentro de la transacción.
 */
export enum SessionSetting {
  ActorId = 'app.actor_id',
  ActorType = 'app.actor_type',
  TenantId = 'app.tenant_id',
  TraceId = 'app.trace_id',
  /** `on` en la transacción de un mantenimiento que recorre todos los tenants de un shard. */
  Maintenance = 'app.maintenance',
}

/** Operación registrada en `audit_log`. Coincide con `TG_OP` de Postgres. */
export enum AuditOperation {
  Insert = 'INSERT',
  Update = 'UPDATE',
  Delete = 'DELETE',
}

/** Forma de particionar una tabla. */
export enum PartitionBy {
  Range = 'range',
  List = 'list',
  Hash = 'hash',
}

/** Intervalo de una partición por rango. */
export enum PartitionInterval {
  Day = 'day',
  Month = 'month',
}
