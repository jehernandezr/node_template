import type { TenantMoveTable } from './tenant-move-table.js';

/**
 * What a service declares to move a tenant: its shard tables in dependency order, parents
 * before children. The copy follows that order and the deletion, the reverse.
 */
export abstract class TenantMoveManifest {
  /**
   * Lists the tables of the tenant in copy order, parents before children.
   * @returns The tables.
   */
  abstract tables(): readonly TenantMoveTable[];
}
