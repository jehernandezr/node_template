import { Injectable } from '@nestjs/common';
import type { TenantDirectoryEntry } from '@contracts/platform';
import { TenantShardGroups } from '@platform/tenant-move';
import type { PlacedTenant } from '../domain/placed-tenant.js';

/** What the other services record about a tenant: its region and the shard groups identity chose. */
@Injectable()
export class TenantDirectoryEntryFactory {
  constructor(private readonly groups: TenantShardGroups) {}

  /**
   * Describes where a placed tenant lives in the form the other services' directories store.
   * @param tenantId Placed tenant.
   * @param placed Its region and shard.
   * @returns The entry.
   */
  of(tenantId: string, placed: PlacedTenant): TenantDirectoryEntry {
    return {
      tenantId,
      region: placed.region,
      groups: this.groups.groupsOf(placed.region, placed.shards),
      dedicated: placed.dedicated,
    };
  }
}
