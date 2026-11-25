import {
  TenantMoveManifest,
  TenantMoveSelectorKind,
  type TenantMoveTable,
} from '@platform/tenant-move';

/** The billing shard tables that travel with a tenant. Plans live in the catalog and do not move. */
export class BillingTenantMoveManifest extends TenantMoveManifest {
  private static readonly TABLES: readonly TenantMoveTable[] = [
    {
      table: 'subscriptions',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
    {
      table: 'usage_records',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
    {
      table: 'usage_totals',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
    {
      table: 'billing_members',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
    {
      table: 'invoices',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
    {
      table: 'invoice_lines',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
    {
      table: 'invoice_sequences',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
    {
      table: 'payment_attempts',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
  ];

  tables(): readonly TenantMoveTable[] {
    return BillingTenantMoveManifest.TABLES;
  }
}
