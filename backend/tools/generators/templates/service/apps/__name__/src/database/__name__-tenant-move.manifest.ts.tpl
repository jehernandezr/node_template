import {
  TenantMoveManifest,
  type TenantMoveTable,
} from '@platform/tenant-move';

/**
 * The __name__ shard tables that travel with a tenant, parents before children. Each module that creates
 * a tenant table adds it here.
 */
export class __Name__TenantMoveManifest extends TenantMoveManifest {
  private static readonly TABLES: readonly TenantMoveTable[] = [];

  tables(): readonly TenantMoveTable[] {
    return __Name__TenantMoveManifest.TABLES;
  }
}
