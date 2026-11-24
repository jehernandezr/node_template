import {
  TenantMoveManifest,
  TenantMoveSelectorKind,
  type TenantMoveTable,
} from '@platform/tenant-move';

/** Las tablas de shard de reports que viajan con un tenant: sus ejecuciones y sus proyecciones. */
export class ReportsTenantMoveManifest extends TenantMoveManifest {
  private static readonly TABLES: readonly TenantMoveTable[] = [
    {
      table: 'report_runs',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
    {
      table: 'proj_tasks',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
    {
      table: 'proj_invoices',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
    {
      table: 'proj_deliveries',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
    {
      table: 'proj_backfills',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
  ];

  tables(): readonly TenantMoveTable[] {
    return ReportsTenantMoveManifest.TABLES;
  }
}
