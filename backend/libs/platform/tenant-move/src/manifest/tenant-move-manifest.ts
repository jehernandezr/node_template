import type { TenantMoveTable } from './tenant-move-table.js';

/**
 * What a service declares to move a tenant: its shard tables in dependency order, parents
 * before children. The copy follows that order and the deletion, the reverse.
 */
export abstract class TenantMoveManifest {
  abstract tables(): readonly TenantMoveTable[];
}
