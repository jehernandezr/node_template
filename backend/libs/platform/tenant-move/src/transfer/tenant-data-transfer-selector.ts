import type { Clock } from '@platform/kernel';
import type { TenantMoveSettings } from '../config/tenant-move.config.js';
import { TenantMoveStrategy } from '../config/tenant-move-strategy.enum.js';
import { MergedTenantMoveManifest } from '../manifest/merged-tenant-move-manifest.js';
import { PlatformTenantMoveManifest } from '../manifest/platform-tenant-move-manifest.js';
import type { TenantMoveManifest } from '../manifest/tenant-move-manifest.js';
import { BatchTenantDataTransfer } from './batch/batch-tenant-data-transfer.js';
import { CompositeTenantDataTransfer } from './composite-tenant-data-transfer.js';
import { LogicalReplicationTransfer } from './logical/logical-replication-transfer.js';
import type { TenantDataTransfer } from './tenant-data-transfer.js';

/**
 * Elige la estrategia de copia según `TENANT_MOVE_STRATEGY` y le suma al manifiesto del servicio las tablas de la
 * plataforma. Un manifiesto que la replicación lógica no puede copiar (alguna tabla llega al tenant por su padre, como
 * en identity) usa la copia por lotes aunque la variable pida la lógica: la variable es de todo el despliegue y cada
 * servicio usa la mejor que su manifiesto admite. Las tablas de la plataforma siempre van por lotes, porque la
 * bitácora de pasos de las sagas llega al tenant por su saga.
 */
export class TenantDataTransferSelector {
  select(
    settings: TenantMoveSettings,
    manifest: TenantMoveManifest,
    clock: Clock,
  ): TenantDataTransfer {
    const platform = new PlatformTenantMoveManifest();
    const batchOf = (tables: TenantMoveManifest) =>
      new BatchTenantDataTransfer(tables, clock, {
        batchSize: settings.TENANT_MOVE_BATCH_SIZE,
        callBudgetMs: settings.TENANT_MOVE_CALL_BUDGET_MS,
        deltaMarginMs: settings.TENANT_MOVE_DELTA_MARGIN_MS,
        caughtUpRows: settings.TENANT_MOVE_CAUGHT_UP_ROWS,
      });
    if (
      settings.TENANT_MOVE_STRATEGY === TenantMoveStrategy.Batch ||
      !LogicalReplicationTransfer.supports(manifest)
    ) {
      return batchOf(new MergedTenantMoveManifest([manifest, platform]));
    }
    return new CompositeTenantDataTransfer(
      [
        new LogicalReplicationTransfer(manifest, batchOf(manifest), clock, {
          callBudgetMs: settings.TENANT_MOVE_CALL_BUDGET_MS,
          caughtUpBytes: settings.TENANT_MOVE_CAUGHT_UP_BYTES,
          lockTimeoutMs: settings.TENANT_MOVE_LOCK_TIMEOUT_MS,
          sourceHost: settings.TENANT_MOVE_REPLICATION_HOST,
          sourcePort: settings.TENANT_MOVE_REPLICATION_PORT,
        }),
        batchOf(platform),
      ],
      clock,
      settings.TENANT_MOVE_CALL_BUDGET_MS,
    );
  }
}
