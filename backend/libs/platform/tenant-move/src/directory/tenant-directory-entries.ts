import type {
  TenantDirectoryAck,
  TenantDirectoryEntry,
  TenantDirectoryRef,
} from '@contracts/platform';
import {
  DirectoryWriteResult,
  ShardingError,
  ShardingErrorCode,
  TenantStatus,
  type DirectoryStore,
  type DirectoryWriter,
  type ShardRouter,
  type TenantPlacement,
} from '@platform/sharding';
import { TenantMoveErrorCode } from '../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../errors/tenant-move.error.js';
import type { TenantDataPresence } from './tenant-data-presence.js';
import type { TenantShardGroups } from './tenant-shard-groups.js';

/**
 * A tenant row in the shard directory of a service that follows the placement identity chose. `place`
 * creates it on the service shards that match the chosen groups and, if it already exists, leaves it as is: the
 * sign-up saga repeats it and a later move may have changed it. `remove` is its reverse, before the tenant has
 * data: it refuses to remove a tenant that already has data in the service or is in the middle of a move.
 */
export class TenantDirectoryEntries {
  private static readonly MAX_ATTEMPTS = 3;

  constructor(
    private readonly writer: DirectoryWriter,
    private readonly directory: DirectoryStore,
    private readonly router: ShardRouter,
    private readonly groups: TenantShardGroups,
    private readonly presence: TenantDataPresence,
  ) {}

  /**
   * @throws TenantMoveError `UnknownTarget` if a group does not lead to a shard in this service's directory.
   * @throws TenantMoveError `ShardTaken` if the group collides with a dedicated tenant, or the tenant is dedicated and the
   *   shard is occupied.
   */
  async place(entry: TenantDirectoryEntry): Promise<TenantDirectoryAck> {
    const shardGroup = await this.shardsOf(entry);
    for (
      let attempt = 1;
      attempt <= TenantDirectoryEntries.MAX_ATTEMPTS;
      attempt++
    ) {
      if ((await this.writer.readPlacement(entry.tenantId)) !== undefined) {
        return { tenantId: entry.tenantId };
      }
      const result = await this.writer.putPlacement(
        {
          tenantId: entry.tenantId,
          region: entry.region,
          shardGroup,
          status: TenantStatus.Active,
          version: 1,
          dedicated: entry.dedicated,
        },
        undefined,
      );
      if (result === DirectoryWriteResult.Written) {
        await this.router.invalidate(entry.tenantId, { version: 1 });
        return { tenantId: entry.tenantId };
      }
      if (result === DirectoryWriteResult.ShardTaken) {
        throw new TenantMoveError(
          TenantMoveErrorCode.ShardTaken,
          'The shard group of the tenant is taken in this directory',
          { tenantId: entry.tenantId, shardGroup },
        );
      }
    }
    throw TenantDirectoryEntries.contended(entry.tenantId);
  }

  /**
   * @throws TenantMoveError `MoveInProgress` if the tenant has its gate closed by a move.
   * @throws TenantMoveError `TenantHasData` if the tenant already has rows in the service tables.
   */
  async remove(ref: TenantDirectoryRef): Promise<TenantDirectoryAck> {
    for (
      let attempt = 1;
      attempt <= TenantDirectoryEntries.MAX_ATTEMPTS;
      attempt++
    ) {
      const current = await this.writer.readPlacement(ref.tenantId);
      if (current === undefined) {
        return { tenantId: ref.tenantId };
      }
      await this.assertRemovable(current);
      const result = await this.writer.deletePlacement(
        ref.tenantId,
        current.version,
      );
      if (result === DirectoryWriteResult.Written) {
        await this.router.invalidate(ref.tenantId);
        return { tenantId: ref.tenantId };
      }
    }
    throw TenantDirectoryEntries.contended(ref.tenantId);
  }

  /** @throws TenantMoveError `MoveInProgress` o `TenantHasData`. */
  private async assertRemovable(placement: TenantPlacement): Promise<void> {
    if (placement.status === TenantStatus.Migrating) {
      throw new TenantMoveError(
        TenantMoveErrorCode.MoveInProgress,
        'The tenant is being moved',
        { tenantId: placement.tenantId },
      );
    }
    if (await this.presence.holdsData(placement)) {
      throw new TenantMoveError(
        TenantMoveErrorCode.TenantHasData,
        'The tenant already has data in this service',
        { tenantId: placement.tenantId },
      );
    }
  }

  private async shardsOf(entry: TenantDirectoryEntry): Promise<string[]> {
    const shards = [
      ...new Set(
        entry.groups.map((group) => this.groups.shardOf(entry.region, group)),
      ),
    ];
    for (const shard of shards) {
      if ((await this.directory.getInstance(shard)) === undefined) {
        throw new TenantMoveError(
          TenantMoveErrorCode.UnknownTarget,
          'The shard group has no shard in this directory',
          { tenantId: entry.tenantId, shard },
        );
      }
    }
    return shards;
  }

  private static contended(tenantId: string): ShardingError {
    return new ShardingError(
      ShardingErrorCode.InvalidConfiguration,
      'Other writes kept changing the tenant placement',
      { details: { tenantId } },
    );
  }
}
