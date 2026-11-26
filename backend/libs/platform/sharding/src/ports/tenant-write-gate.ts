/**
 * Write gate of a tenant during its move. Closing it makes new writes wait and,
 * if it does not open in time, fail with `PLATFORM.SHARDING.TENANT_MIGRATING`. It is the signal to wait: the guarantee
 * that no write reaches the source after the cutover comes from the shard fence (`TenantWriteFence`
 * from `@platform/persistence`), because `isClosed` may read from a cache.
 */
export abstract class TenantWriteGate {
  /**
   * Tells whether the tenant's writes are paused by a move.
   * @param tenantId Tenant to check.
   * @returns `true` when closed.
   */
  abstract isClosed(tenantId: string): Promise<boolean>;

  /**
   * Idempotent: closing a closed gate changes nothing.
   * @param tenantId Tenant to pause.
   */
  abstract close(tenantId: string): Promise<void>;

  /**
   * Idempotent: opening an open gate changes nothing.
   * @param tenantId Tenant to resume.
   */
  abstract open(tenantId: string): Promise<void>;
}
