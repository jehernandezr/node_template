import { tenantMoveConfigSchema } from '../../config/tenant-move.config.js';
import type { BatchTransferOptions } from '../../transfer/batch/batch-transfer-options.js';

/**
 * Copy settings of a move rehearsal. A quiet move copies in the batch the suite asks for, small enough to split each
 * table into several batches. A move whose tenant keeps writing copies in the service batch: with one row per batch,
 * every delta round rereads each row written inside the look-back margin one round trip at a time, so the copy falls
 * further behind the writers each round and never catches up on a busy machine.
 */
export class RehearsalTransferOptions {
  /** Rows a sync round may still copy and count as caught up; the freeze and `verify` take over the rest. */
  static readonly CAUGHT_UP_ROWS = 1_000;

  static readonly CALL_BUDGET_MS = 4_000;

  static readonly DELTA_MARGIN_MS = 60_000;

  /** The batch the service copies in when nothing overrides it. */
  static readonly SERVICE_BATCH_SIZE = tenantMoveConfigSchema.parse({})
    .TENANT_MOVE_BATCH_SIZE;

  /**
   * @param batchSize Rows per batch of a quiet move; the service batch when absent.
   */
  constructor(private readonly batchSize: number | undefined) {}

  /**
   * Settings of a move with no writes during the copy.
   * @returns The options with the batch the suite asked for.
   */
  quiet(): BatchTransferOptions {
    return this.with(
      this.batchSize ?? RehearsalTransferOptions.SERVICE_BATCH_SIZE,
    );
  }

  /**
   * Settings of a move whose tenant keeps writing during the copy.
   * @returns The options with the service batch, whatever the suite asked for.
   */
  underWrites(): BatchTransferOptions {
    return this.with(RehearsalTransferOptions.SERVICE_BATCH_SIZE);
  }

  private with(batchSize: number): BatchTransferOptions {
    return {
      batchSize,
      callBudgetMs: RehearsalTransferOptions.CALL_BUDGET_MS,
      deltaMarginMs: RehearsalTransferOptions.DELTA_MARGIN_MS,
      caughtUpRows: RehearsalTransferOptions.CAUGHT_UP_ROWS,
    };
  }
}
