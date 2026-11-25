import { TenantMoveManifest } from '../../manifest/tenant-move-manifest.js';
import { TenantMoveSelectorKind } from '../../manifest/tenant-move-selector-kind.enum.js';
import type { TenantMoveTable } from '../../manifest/tenant-move-table.js';

/** Manifiesto de las tablas de prueba: `ledgers` con columna del tenant y `entries` colgando de su ledger. */
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

/** Solo `ledgers`: lo que admite la replicación lógica, que no sigue a los hijos por su padre. */
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

/** `ledgers` y `attempts`, una bitácora sin `updated_at` como `login_attempts`: solo se inserta. */
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
