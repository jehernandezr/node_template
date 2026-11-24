/**
 * Compuerta de escritura de un tenant durante su traslado. Cerrarla hace que las escrituras nuevas esperen y,
 * si no se abre a tiempo, fallen con `PLATFORM.SHARDING.TENANT_MIGRATING`. Es la señal para esperar: la garantía
 * de que ninguna escritura llegue al origen después del corte la da la barrera del shard (`TenantWriteFence`
 * de `@platform/persistence`), porque `isClosed` puede leer de un caché.
 */
export abstract class TenantWriteGate {
  abstract isClosed(tenantId: string): Promise<boolean>;

  /** Idempotente: cerrar una compuerta cerrada no cambia nada. */
  abstract close(tenantId: string): Promise<void>;

  /** Idempotente: abrir una compuerta abierta no cambia nada. */
  abstract open(tenantId: string): Promise<void>;
}
