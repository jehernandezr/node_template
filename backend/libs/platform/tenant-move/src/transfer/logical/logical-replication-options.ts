/** Ajustes de `LogicalReplicationTransfer`, de la configuración `TENANT_MOVE_*`. */
export interface LogicalReplicationOptions {
  readonly callBudgetMs: number;
  /** WAL pendiente, en bytes, por debajo del cual la suscripción se da por alcanzada. */
  readonly caughtUpBytes: number;
  /** Espera máxima por el candado de `ALTER TABLE ... REPLICA IDENTITY`. */
  readonly lockTimeoutMs: number;
  /** Cómo llega el servidor de destino al de origen; por defecto, la dirección que usa el servicio. */
  readonly sourceHost?: string;
  readonly sourcePort?: number;
}
