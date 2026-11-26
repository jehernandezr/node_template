import type { DirectoryWriteResult } from '../model/directory-write-result.enum.js';
import type { TenantPlacement } from '../model/tenant-placement.js';

/**
 * Write side of the directory, used by the sign-up and move sagas.
 * Every write is conditional, so two concurrent sagas never both win:
 *
 * - `putPlacement` compares and sets on `version`. Creating a tenant
 *   (`expectedVersion` undefined) only works if it has no row; updating
 *   only works if the stored version is `expectedVersion`, and the new
 *   placement carries `expectedVersion + 1`.
 * - Shard exclusivity is checked in the same atomic step as the
 *   write (in Postgres, a transaction that locks the target shard rows
 *   with `SELECT ... FOR UPDATE` before counting their tenants, or an
 *   exclusion constraint). A pure policy does not see a concurrent placement;
 *   this check prevents two dedicated tenants from taking the same empty shard.
 *
 * After a successful update, the writer calls
 * `ShardRouter.invalidate(tenantId, { version })`, which also publishes
 * `ShardingEvent.ShardDirectoryChanged` when the router has a publisher.
 */
export abstract class DirectoryWriter {
  /**
   * Placement of a tenant read from the primary, the basis of a conditional write.
   * @param tenantId Tenant to read.
   * @returns The placement, or `undefined`.
   */
  abstract readPlacement(
    tenantId: string,
  ): Promise<TenantPlacement | undefined>;

  /**
   * Placements of a region, the input of a `ShardPlacementPolicy`.
   * @param region Region to read.
   * @returns The placements.
   */
  abstract listPlacements(region: string): Promise<readonly TenantPlacement[]>;

  /**
   * Writes a placement only if the stored version is the expected one.
   * @param placement New placement. Its version is 1 for a new tenant and `expectedVersion + 1` otherwise.
   * @param expectedVersion Version the caller read, or `undefined` to create the tenant.
   * @returns Whether it was written, or the conflict.
   */
  abstract putPlacement(
    placement: TenantPlacement,
    expectedVersion: number | undefined,
  ): Promise<DirectoryWriteResult>;

  /**
   * Deletes a tenant row only if its stored version is `expectedVersion`. It reverses the sign-up, before
   * the tenant has data.
   * @returns `Written` if it deleted, `VersionConflict` if the row changed or no longer exists.
   * @param tenantId Tenant to delete.
   * @param expectedVersion Version it must have.
   * @returns Whether it was deleted, or the conflict.
   */
  abstract deletePlacement(
    tenantId: string,
    expectedVersion: number,
  ): Promise<DirectoryWriteResult>;
}
