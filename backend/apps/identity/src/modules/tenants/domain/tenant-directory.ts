/** Global slug index in the catalog (`tenant_lookup`). */
export abstract class TenantDirectory {
  /** Reserves the slug. Returns `false` if it already belongs to another tenant. */
  abstract reserve(
    slug: string,
    tenantId: string,
    region: string,
  ): Promise<boolean>;

  abstract release(slug: string, tenantId: string): Promise<void>;

  /** Whether any tenant has the slug reserved. */
  abstract isTaken(slug: string): Promise<boolean>;

  /** The tenant's slug, if it has one reserved. */
  abstract slugOf(tenantId: string): Promise<string | undefined>;

  /** Points the tenant's slug to its new region after a move. */
  abstract relocate(tenantId: string, region: string): Promise<void>;
}
