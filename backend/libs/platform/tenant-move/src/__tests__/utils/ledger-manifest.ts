import { TenantMoveManifest } from '../../manifest/tenant-move-manifest.js';
import { TenantMoveSelectorKind } from '../../manifest/tenant-move-selector-kind.enum.js';
import type { TenantMoveTable } from '../../manifest/tenant-move-table.js';

/** Manifest of the test tables: `ledgers` with a tenant column and `entries` hanging from their ledger. */
export class LedgerManifest extends TenantMoveManifest {
  tables(): readonly TenantMoveTable[] {
    return [
      {
        table: 'ledgers',
        selector: {
          kind: TenantMoveSelectorKind.TenantColumn,
          column: 'tenant_id',
        },
      },
      {
        table: 'entries',
        selector: {
          kind: TenantMoveSelectorKind.ViaParent,
          parent: 'ledgers',
          column: 'ledger_id',
          parentColumn: 'id',
        },
      },
    ];
  }
}

/** Only `ledgers`: what logical replication supports, since it does not follow children through their parent. */
export class LedgersOnlyManifest extends TenantMoveManifest {
  tables(): readonly TenantMoveTable[] {
    return [
      {
        table: 'ledgers',
        selector: {
          kind: TenantMoveSelectorKind.TenantColumn,
          column: 'tenant_id',
        },
      },
    ];
  }
}

/** `ledgers` and `attempts`, a log without `updated_at` like `login_attempts`: insert only. */
export class LedgerWithAttemptsManifest extends TenantMoveManifest {
  tables(): readonly TenantMoveTable[] {
    return [
      {
        table: 'ledgers',
        selector: {
          kind: TenantMoveSelectorKind.TenantColumn,
          column: 'tenant_id',
        },
      },
      {
        table: 'attempts',
        selector: {
          kind: TenantMoveSelectorKind.TenantColumn,
          column: 'tenant_id',
        },
      },
    ];
  }
}
