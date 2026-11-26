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
   * @param transfer Move with its shards.
   * @returns The progress.
   * @throws TenantMoveError `RoundPending` if the round did not finish within the budget.
   */
  abstract sync(transfer: TenantTransfer): Promise<TenantMoveProgress>;

  /**
   * Runs the last round and the verification, with the tenant already frozen on the source.
   * @param transfer Move with its shards.
   * @returns The verification.
   * @throws TenantMoveError `RoundPending` if it did not finish within the budget; the next call continues where it left off.
   */
  abstract verify(transfer: TenantTransfer): Promise<TenantMoveVerification>;

  /**
   * Discards what was copied to the target.
   * @param transfer Move with its shards.
   */
  abstract abort(transfer: TenantTransfer): Promise<void>;

  /**
   * Deletes the tenant data left on the source after the move, within `budget` if given.
   * @param tenantId Moved tenant.
   * @param source Source shard.
   * @param budget Time budget of the call.
   * @throws TenantMoveError `RoundPending` if it did not finish within the budget; the next call continues where it left off.
   */
  abstract cleanup(
    tenantId: string,
    source: ShardLocation,
    budget?: TransferBudget,
  ): Promise<void>;

  /**
   * Sets to `region` the region columns the manifest declares, in the tenant rows on `target`.
   * @param tenantId Moved tenant.
   * @param target Target shard.
   * @param region New region.
   */
  abstract assignRegion(
    tenantId: string,
    target: ShardLocation,
    region: string,
  ): Promise<void>;
}
