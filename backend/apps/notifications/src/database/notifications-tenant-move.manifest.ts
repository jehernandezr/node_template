import {
  TenantMoveManifest,
  TenantMoveSelectorKind,
  type TenantMoveTable,
} from '@platform/tenant-move';

/** Las tablas de notifications que viajan con un tenant: las de los usuarios cuyo tenant de origen es él. */
export class NotificationsTenantMoveManifest extends TenantMoveManifest {
  private static readonly TABLES: readonly TenantMoveTable[] = [
    {
      table: 'notification_preferences',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'home_tenant_id',
      },
    },
    {
      table: 'notifications',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'home_tenant_id',
      },
    },
    {
      table: 'notification_deliveries',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'home_tenant_id',
      },
    },
  ];

  tables(): readonly TenantMoveTable[] {
    return NotificationsTenantMoveManifest.TABLES;
  }
}
