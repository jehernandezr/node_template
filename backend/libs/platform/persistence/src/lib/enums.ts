/** Nodo de la base al que va una sentencia. */
export enum DatabaseRole {
  /** Primario: escrituras, transacciones y lecturas justo después de escribir. */
  Primary = 'primary',
  /** Réplica de lectura. Sin réplica configurada se usa el primario. */
  Replica = 'replica',
}

/** Intención de una operación. Decide primario o réplica y si hace falta transacción. */
export enum DataAccess {
  Read = 'read',
  Write = 'write',
}

/** Nivel de aislamiento de una transacción. */
export enum IsolationLevel {
  ReadCommitted = 'READ COMMITTED',
  RepeatableRead = 'REPEATABLE READ',
  Serializable = 'SERIALIZABLE',
}

/** Bloqueo pesimista de filas leídas dentro de una transacción. */
export enum RowLock {
  /** `FOR UPDATE`: bloquea la fila para modificarla. */
  ForUpdate = 'FOR UPDATE',
  /** `FOR SHARE`: impide que otros la modifiquen mientras dura la transacción. */
  ForShare = 'FOR SHARE',
  /** `FOR UPDATE SKIP LOCKED`: toma solo filas libres, útil para colas sobre tablas. */
  ForUpdateSkipLocked = 'FOR UPDATE SKIP LOCKED',
}

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
