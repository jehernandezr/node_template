/** How long a write waits for its tenant gate to open. */
export interface TenantWriteWaiterOptions {
  /** Maximum wait before answering `PLATFORM.SHARDING.TENANT_MIGRATING`. */
  readonly maxWaitMs: number;
  /** How often it checks the gate again while waiting. */
  readonly pollMs: number;
}
