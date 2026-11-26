/** Global slug index in the catalog (`tenant_lookup`). */
export abstract class TenantDirectory {
  /**
   * Reserves the slug. Returns `false` if it already belongs to another tenant.
   * @param slug Slug to reserve.
   * @param tenantId Tenant that reserves it.
   * @param region Region of the tenant.
   * @returns Whether it was reserved.
   */
  abstract reserve(
    slug: string,
    tenantId: string,
    region: string,
  ): Promise<boolean>;

  /**
   * Releases a slug the tenant reserved.
   * @param slug Slug to release.
   * @param tenantId Tenant that reserved it.
   */
  abstract release(slug: string, tenantId: string): Promise<void>;

  /**
   * Whether any tenant has the slug reserved.
   * @param slug Slug to check.
   * @returns `true` when taken.
   */
  abstract isTaken(slug: string): Promise<boolean>;

  /**
   * The tenant's slug, if it has one reserved.
   * @param tenantId Tenant to read.
   * @returns The slug, or `undefined`.
   */
  abstract slugOf(tenantId: string): Promise<string | undefined>;

  /**
   * Points the tenant's slug to its new region after a move.
   * @param tenantId Moved tenant.
   * @param region New region.
   */
  abstract relocate(tenantId: string, region: string): Promise<void>;
}
