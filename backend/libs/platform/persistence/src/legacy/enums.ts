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

/** Bloqueo pesimista de filas leídas dentro de una transacción. */
export enum RowLock {
  /** `FOR UPDATE`: bloquea la fila para modificarla. */
  ForUpdate = 'FOR UPDATE',
  /** `FOR SHARE`: impide que otros la modifiquen mientras dura la transacción. */
  ForShare = 'FOR SHARE',
  /** `FOR UPDATE SKIP LOCKED`: toma solo filas libres, útil para colas sobre tablas. */
  ForUpdateSkipLocked = 'FOR UPDATE SKIP LOCKED',
}
