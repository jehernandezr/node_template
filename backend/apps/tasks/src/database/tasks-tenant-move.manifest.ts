import {
  TenantMoveManifest,
  TenantMoveSelectorKind,
  type TenantMoveTable,
} from '@platform/tenant-move';

/** Las tablas de shard de tasks que viajan con un tenant: sus tareas y sus documentos de búsqueda. */
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

  tables(): readonly TenantMoveTable[] {
    return TasksTenantMoveManifest.TABLES;
  }
}
