import {
  TenantMoveManifest,
  TenantMoveSelectorKind,
  type TenantMoveTable,
} from '@platform/tenant-move';

/** The tasks shard tables that travel with a tenant: its tasks and its search documents. */
export class TasksTenantMoveManifest extends TenantMoveManifest {
  private static readonly TABLES: readonly TenantMoveTable[] = [
    {
      table: 'tasks',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
    {
      table: 'search_documents',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
  ];

  override tables(): readonly TenantMoveTable[] {
    return TasksTenantMoveManifest.TABLES;
  }
}
