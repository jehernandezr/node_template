/** Cuánto espera una escritura a que se abra la compuerta de su tenant. */
export interface TenantWriteWaiterOptions {
  /** Espera máxima antes de responder `PLATFORM.SHARDING.TENANT_MIGRATING`. */
  readonly maxWaitMs: number;
  /** Cada cuánto vuelve a mirar la compuerta mientras espera. */
  readonly pollMs: number;
}
