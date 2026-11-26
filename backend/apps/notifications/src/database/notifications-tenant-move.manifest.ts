import {
  TenantMoveManifest,
  TenantMoveSelectorKind,
  type TenantMoveTable,
} from '@platform/tenant-move';

/** The notifications tables that travel with a tenant: those of the users whose home tenant it is. */
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

  override tables(): readonly TenantMoveTable[] {
    return NotificationsTenantMoveManifest.TABLES;
  }
}
