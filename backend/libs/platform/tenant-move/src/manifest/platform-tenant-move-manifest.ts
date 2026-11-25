import { TenantMoveManifest } from './tenant-move-manifest.js';
import { TenantMoveSelectorKind } from './tenant-move-selector-kind.enum.js';
import type { TenantMoveTable } from './tenant-move-table.js';

/**
 * The platform tables with tenant data that live on every shard of every service and travel with the tenant:
 * - `idempotency_keys`: a retry with the same key after the switch answers what was stored instead of repeating
 *   the effects on the target;
 * - `processed_messages`: a message the source already processed that arrives again after the switch is recognized
 *   as a duplicate on the target;
 * - `saga.instances` and `saga.step_log`: the state of the tenant sagas is still queried from its shard.
 *
 * `outbox` and `audit_log` stay on the source on purpose (ADR 0032).
 */
export class PlatformTenantMoveManifest extends TenantMoveManifest {
  static readonly SAGA_INSTANCES = 'saga.instances';

  tables(): readonly TenantMoveTable[] {
    return [
      {
        table: 'idempotency_keys',
        selector: {
          kind: TenantMoveSelectorKind.TenantColumn,
          column: 'tenant_id',
        },
      },
      {
        table: 'processed_messages',
        selector: {
          kind: TenantMoveSelectorKind.TenantColumn,
          column: 'tenant_id',
        },
      },
      {
        table: PlatformTenantMoveManifest.SAGA_INSTANCES,
        selector: {
          kind: TenantMoveSelectorKind.TenantColumn,
          column: 'tenant_id',
        },
      },
      {
        table: 'saga.step_log',
        selector: {
          kind: TenantMoveSelectorKind.ViaParent,
          parent: PlatformTenantMoveManifest.SAGA_INSTANCES,
          column: 'saga_id',
          parentColumn: 'id',
        },
      },
    ];
  }
}
