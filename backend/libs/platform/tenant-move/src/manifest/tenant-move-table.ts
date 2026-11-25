import type { TenantMoveSelectorKind } from './tenant-move-selector-kind.enum.js';

/** Rows of a table with its own tenant column. */
export interface TenantColumnSelector {
  readonly kind: TenantMoveSelectorKind.TenantColumn;
  readonly column: string;
}

/** Rows of a table whose `column` points to `parentColumn` of a tenant row in `parent`. */
export interface ViaParentSelector {
  readonly kind: TenantMoveSelectorKind.ViaParent;
  readonly parent: string;
  readonly column: string;
  readonly parentColumn: string;
}

/** A shard table the move copies, and how the tenant rows are reached. */
export interface TenantMoveTable {
  readonly table: string;
  readonly selector: TenantColumnSelector | ViaParentSelector;
  /**
   * Column that stores the tenant region. On pivot, the move changes it to the target region in the copy,
   * before opening writes: afterwards it could not, because the source region stops routing the tenant.
   */
  readonly regionColumn?: string;
}
