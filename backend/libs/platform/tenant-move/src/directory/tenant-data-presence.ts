import type { TenantPlacement } from '@platform/sharding';

/** Whether a tenant already has service data on any of the shards of its placement. */
export abstract class TenantDataPresence {
  /**
   * Returns whether the tenant has service rows on any shard of its placement.
   * @param placement Current location of the tenant in the directory.
   * @returns `true` if there is at least one row: removing it from the directory would orphan them.
   */
  abstract holdsData(placement: TenantPlacement): Promise<boolean>;
}
