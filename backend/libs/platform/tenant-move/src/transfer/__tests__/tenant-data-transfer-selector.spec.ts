import { FixedClock } from '@platform/kernel/test-utils';
import { tenantMoveConfigSchema } from '../../config/tenant-move.config.js';
import { TenantMoveStrategy } from '../../config/tenant-move-strategy.enum.js';
import { TenantMoveErrorCode } from '../../errors/tenant-move-error-code.enum.js';
import {
  LedgerManifest,
  LedgersOnlyManifest,
} from '../../__tests__/utils/index.js';
import { MergedTenantMoveManifest } from '../../manifest/merged-tenant-move-manifest.js';
import { PlatformTenantMoveManifest } from '../../manifest/platform-tenant-move-manifest.js';
import { BatchTenantDataTransfer } from '../batch/batch-tenant-data-transfer.js';
import { CompositeTenantDataTransfer } from '../composite-tenant-data-transfer.js';
import { LogicalReplicationTransfer } from '../logical/logical-replication-transfer.js';
import { TenantDataTransferSelector } from '../tenant-data-transfer-selector.js';
import { TransferBudget } from '../transfer-budget.js';

const settingsFor = (strategy: TenantMoveStrategy) =>
  tenantMoveConfigSchema.parse({ TENANT_MOVE_STRATEGY: strategy });

describe('TenantDataTransferSelector', () => {
  const selector = new TenantDataTransferSelector();
  const clock = new FixedClock();

  it('copies by batches unless the logical replication is chosen, and then copies the platform tables by batches', () => {
    expect(
      selector.select(
        settingsFor(TenantMoveStrategy.Batch),
        new LedgerManifest(),
        clock,
      ),
    ).toBeInstanceOf(BatchTenantDataTransfer);
    expect(
      selector.select(
        settingsFor(TenantMoveStrategy.LogicalReplication),
        new LedgersOnlyManifest(),
        clock,
      ),
    ).toBeInstanceOf(CompositeTenantDataTransfer);
  });

  it('adds the platform tables to the manifest of the service', () => {
    const merged = new MergedTenantMoveManifest([
      new LedgerManifest(),
      new PlatformTenantMoveManifest(),
    ]);

    expect(merged.tables().map((entry) => entry.table)).toEqual([
      'ledgers',
      'entries',
      'idempotency_keys',
      'saga.instances',
      'saga.step_log',
    ]);
  });

  it('copies by batches a manifest with tables reached through their parent even when the logical replication is chosen', () => {
    expect(
      selector.select(
        settingsFor(TenantMoveStrategy.LogicalReplication),
        new LedgerManifest(),
        clock,
      ),
    ).toBeInstanceOf(BatchTenantDataTransfer);
  });

  it('refuses to build the logical replication for a manifest with tables reached through their parent', () => {
    expect(
      () =>
        new LogicalReplicationTransfer(
          new LedgerManifest(),
          new BatchTenantDataTransfer(new LedgerManifest(), clock, {
            batchSize: 1,
            callBudgetMs: 1_000,
            deltaMarginMs: 0,
            caughtUpRows: 0,
          }),
          clock,
          { callBudgetMs: 1_000, caughtUpBytes: 0, lockTimeoutMs: 1_000 },
        ),
    ).toThrow(
      expect.objectContaining({ code: TenantMoveErrorCode.InvalidManifest }),
    );
  });
});

describe('TransferBudget', () => {
  it('lets the round go on within the budget and asks to repeat the call once it is spent', () => {
    const clock = new FixedClock();
    const budget = new TransferBudget(clock, 1_000);

    expect(() => budget.check('ledgers')).not.toThrow();
    clock.advance(1_000);
    expect(() => budget.check('ledgers')).toThrow(
      expect.objectContaining({
        code: TenantMoveErrorCode.RoundPending,
        retryable: true,
      }),
    );
  });
});
