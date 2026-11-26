import type {
  TenantMoveProgress,
  TenantMoveVerification,
} from '@contracts/platform';
import type { ShardLocation } from '@platform/persistence';
import type { TenantTransfer } from './tenant-transfer.js';
import type { TransferBudget } from './transfer-budget.js';

/**
 * Copies a tenant's data from its source shard to the target one, according to the service manifest. Each method
 * works within one call's budget and is idempotent: repeating it continues where it left off.
 */
export abstract class TenantDataTransfer {
  /**
   * Runs one copy round while writes continue.
   * @throws TenantMoveError `RoundPending` if the round did not finish within the budget.
   */
  abstract sync(transfer: TenantTransfer): Promise<TenantMoveProgress>;

  /**
   * Runs the last round and the verification, with the tenant already frozen on the source.
   * @throws TenantMoveError `RoundPending` if it did not finish within the budget; the next call continues where it left off.
   */
  abstract verify(transfer: TenantTransfer): Promise<TenantMoveVerification>;

  /** Discards what was copied to the target. */
  abstract abort(transfer: TenantTransfer): Promise<void>;

  /**
   * Deletes the tenant data left on the source after the move, within `budget` if given.
   * @throws TenantMoveError `RoundPending` if it did not finish within the budget; the next call continues where it left off.
   */
  abstract cleanup(
    tenantId: string,
    source: ShardLocation,
    budget?: TransferBudget,
  ): Promise<void>;

  /** Sets to `region` the region columns the manifest declares, in the tenant rows on `target`. */
  abstract assignRegion(
    tenantId: string,
    target: ShardLocation,
    region: string,
  ): Promise<void>;
}
