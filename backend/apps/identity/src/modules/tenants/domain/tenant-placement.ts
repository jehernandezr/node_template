import type { PlacedTenant } from './placed-tenant.js';

/** Places a tenant in its region's shards before writing its data. */
export abstract class TenantPlacement {
  /**
   * A normal tenant goes to the least loaded shard. The shared customer tenant spreads its users across
   * every shard in the region, so its group includes all of them. A tenant that was already placed
   * receives its usual placement.
   * @param tenantId Tenant to place.
   * @param region Region of the tenant.
   * @param spread Whether its users spread across the region.
   * @returns The placement.
   */
  abstract place(
    tenantId: string,
    region: string,
    spread: boolean,
  ): Promise<PlacedTenant>;
}
