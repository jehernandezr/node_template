/** The smoke tenant as the region seed creates it: placed in the shared customer group and recorded in every service. */
export abstract class SmokeTenants {
  /**
   * Places the tenant in identity's shards before its owner is created there.
   * @param tenantId Smoke tenant.
   */
  abstract place(tenantId: string): Promise<void>;

  /**
   * Creates the tenant with its owner when it is missing, activates it and records it in every service. Idempotent.
   * @param tenantId Smoke tenant.
   * @param ownerUserId Owner of the tenant.
   */
  abstract seed(tenantId: string, ownerUserId: string): Promise<void>;
}
