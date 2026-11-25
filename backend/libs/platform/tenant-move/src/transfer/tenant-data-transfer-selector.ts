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
 * Chooses the copy strategy from `TENANT_MOVE_STRATEGY` and adds the platform tables to the service manifest.
 * A manifest that logical replication cannot copy (some table reaches the tenant through its parent, as
 * in identity) uses the batch copy even if the variable asks for logical: the variable is deployment-wide and each
 * service uses the best one its manifest allows. Platform tables always go by batch, because the
 * saga step log reaches the tenant through its saga.
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
