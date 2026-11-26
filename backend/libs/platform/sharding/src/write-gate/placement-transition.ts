import { ShardingError } from '../errors/sharding-error.js';
import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import { DirectoryWriteResult } from '../model/directory-write-result.enum.js';
import type { TenantPlacement } from '../model/tenant-placement.js';
import type { DirectoryWriter } from '../ports/directory-writer.js';
import type { ShardRouter } from '../shard-router.js';

/** What changes in a placement; `undefined` when it is already as requested. */
export type PlacementChange = (
  current: TenantPlacement,
) =>
  | Partial<Pick<TenantPlacement, 'region' | 'shardGroup' | 'status'>>
  | undefined;

/**
 * Changes a tenant placement with the directory conditional write: reads from the primary, writes the
 * next version and, if another write won in between, reads again. On write it invalidates the router, which
 * publishes the change to the other processes.
 */
export class PlacementTransition {
  private static readonly MAX_ATTEMPTS = 5;

  constructor(
    private readonly writer: DirectoryWriter,
    private readonly router: ShardRouter,
  ) {}

  /**
   * Changes a tenant placement under the write gate.
   * @returns the current placement when done.
   * @param tenantId Tenant to change.
   * @param change Status, shards or region.
   * @throws ShardingError `UnknownTenant` if the directory does not have the tenant; `InvalidConfiguration` if
   *   other writes win every attempt or the new group collides with a dedicated shard.
   */
  async apply(
    tenantId: string,
    change: PlacementChange,
  ): Promise<TenantPlacement> {
    for (
      let attempt = 1;
      attempt <= PlacementTransition.MAX_ATTEMPTS;
      attempt++
    ) {
      const current = await this.writer.readPlacement(tenantId);
      if (current === undefined) {
        throw new ShardingError(
          ShardingErrorCode.UnknownTenant,
          'No placement for tenant',
          { details: { tenantId } },
        );
      }
      const patch = change(current);
      if (patch === undefined) {
        return current;
      }
      const next: TenantPlacement = {
        ...current,
        ...patch,
        version: current.version + 1,
      };
      const result = await this.writer.putPlacement(next, current.version);
      if (result === DirectoryWriteResult.Written) {
        await this.router.invalidate(tenantId, { version: next.version });
        return next;
      }
      if (result === DirectoryWriteResult.ShardTaken) {
        throw PlacementTransition.rejected(tenantId, result);
      }
    }
    throw PlacementTransition.rejected(
      tenantId,
      DirectoryWriteResult.VersionConflict,
    );
  }

  private static rejected(
    tenantId: string,
    result: DirectoryWriteResult,
  ): ShardingError {
    return new ShardingError(
      ShardingErrorCode.InvalidConfiguration,
      'The placement change was rejected by the directory',
      { details: { tenantId, result } },
    );
  }
}
