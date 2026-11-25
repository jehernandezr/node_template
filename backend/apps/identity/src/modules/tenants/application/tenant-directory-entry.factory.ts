import { Injectable } from '@nestjs/common';
import type { TenantDirectoryEntry } from '@contracts/platform';
import { TenantShardGroups } from '@platform/tenant-move';
import type { PlacedTenant } from '../domain/placed-tenant.js';

/** Lo que los demás servicios anotan de un tenant: su región y los grupos de los shards que identity eligió. */
@Injectable()
export class TenantDirectoryEntryFactory {
  constructor(private readonly groups: TenantShardGroups) {}

  of(tenantId: string, placed: PlacedTenant): TenantDirectoryEntry {
    return {
      tenantId,
      region: placed.region,
      groups: this.groups.groupsOf(placed.region, placed.shards),
      dedicated: placed.dedicated,
    };
  }
}
