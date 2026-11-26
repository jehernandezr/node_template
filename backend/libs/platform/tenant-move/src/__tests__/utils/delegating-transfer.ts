import type {
  TenantMoveProgress,
  TenantMoveVerification,
} from '@contracts/platform';
import type { ShardLocation } from '@platform/persistence';
import { QueryFailedError } from 'typeorm';
import { ForeignKeyRound } from '../../transfer/batch/foreign-key-round.js';
import { TenantDataTransfer } from '../../transfer/tenant-data-transfer.js';
import type { TenantTransfer } from '../../transfer/tenant-transfer.js';
import type { TransferBudget } from '../../transfer/transfer-budget.js';

/** Copy that delegates everything to the real one; subclasses change one step to reproduce a scenario. */
export class DelegatingTransfer extends TenantDataTransfer {
  constructor(protected readonly inner: TenantDataTransfer) {
    super();
  }

  /** Delegates to the real copy. */
  sync(transfer: TenantTransfer): Promise<TenantMoveProgress> {
    return this.inner.sync(transfer);
  }

  /** Delegates to the real copy. */
  verify(transfer: TenantTransfer): Promise<TenantMoveVerification> {
    return this.inner.verify(transfer);
  }

  /** Delegates to the real copy. */
  abort(transfer: TenantTransfer): Promise<void> {
    return this.inner.abort(transfer);
  }

  /** Delegates to the real copy. */
  cleanup(
    tenantId: string,
    source: ShardLocation,
    budget?: TransferBudget,
  ): Promise<void> {
    return this.inner.cleanup(tenantId, source, budget);
  }

  /** Delegates to the real copy. */
  assignRegion(
    tenantId: string,
    target: ShardLocation,
    region: string,
  ): Promise<void> {
    return this.inner.assignRegion(tenantId, target, region);
  }
}

/**
 * The first round fails as when the service writes a parent and its child between copying the parent table and
 * the child table: the child reaches the target without its parent, `pg` reports the foreign key violation and the
 * batch copy turns it into a pending round.
 */
export class ForeignKeyRaceTransfer extends DelegatingTransfer {
  private static readonly FOREIGN_KEY_VIOLATION = '23503';
  private raced = false;

  /** Fails the first time as a pending round caused by the foreign key; afterwards it really copies. */
  override sync(transfer: TenantTransfer): Promise<TenantMoveProgress> {
    if (this.raced) {
      return super.sync(transfer);
    }
    this.raced = true;
    return ForeignKeyRound.run(() =>
      Promise.reject(
        new QueryFailedError(
          'INSERT INTO "invoice_lines" ...',
          [],
          Object.assign(
            new Error(
              'insert violates foreign key constraint "invoice_lines_invoice_fk"',
            ),
            { code: ForeignKeyRaceTransfer.FOREIGN_KEY_VIOLATION },
          ),
        ),
      ),
    );
  }
}

/** Runs `probe` right before discarding the copy, to see what state the tenant is in while it is purged. */
export class ProbedAbortTransfer extends DelegatingTransfer {
  constructor(
    inner: TenantDataTransfer,
    private readonly probe: () => Promise<void>,
  ) {
    super(inner);
  }

  /** Checks the state and then purges the target. */
  override async abort(transfer: TenantTransfer): Promise<void> {
    await this.probe();
    await super.abort(transfer);
  }
}
