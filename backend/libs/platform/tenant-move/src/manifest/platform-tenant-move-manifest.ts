import { TenantMoveManifest } from './tenant-move-manifest.js';
import { TenantMoveSelectorKind } from './tenant-move-selector-kind.enum.js';
import type { TenantMoveTable } from './tenant-move-table.js';

/**
 * Las tablas de la plataforma con datos de un tenant que viven en cada shard de todo servicio y viajan con él:
 * - `idempotency_keys`: un reintento con la misma llave después del cambio responde lo guardado en vez de repetir
 *   los efectos en el destino;
 * - `processed_messages`: un mensaje que el origen ya procesó y que llega otra vez después del cambio se reconoce
 *   como repetido en el destino;
 * - `saga.instances` y `saga.step_log`: el estado de las sagas del tenant se sigue consultando desde su shard.
 *
 * `outbox` y `audit_log` se quedan en el origen a propósito (ADR 0032).
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
