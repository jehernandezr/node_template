import { ShardingError, ShardingErrorCode } from './errors.js';
import {
  DirectoryWriteResult,
  type DirectoryStore,
  type DirectoryWriter,
} from './ports.js';
import type { TenantPlacement } from './types.js';

/**
 * In-memory {@link DirectoryStore} and {@link DirectoryWriter}, intended for tests and local setups. The
 * conditional writes follow the {@link DirectoryWriter} contract; the plain setters skip every check.
 */
export class InMemoryDirectoryStore implements DirectoryStore, DirectoryWriter {
  private readonly placements = new Map<string, TenantPlacement>();
  private readonly instances = new Map<string, string>();

  setPlacement(placement: TenantPlacement): void {
    this.placements.set(placement.tenantId, placement);
  }

  removePlacement(tenantId: string): void {
    this.placements.delete(tenantId);
  }

  setInstance(logicalShard: string, instance: string): void {
    this.instances.set(logicalShard, instance);
  }

  removeInstance(logicalShard: string): void {
    this.instances.delete(logicalShard);
  }

  async getPlacement(tenantId: string): Promise<TenantPlacement | undefined> {
    return this.placements.get(tenantId);
  }

  async getInstance(logicalShard: string): Promise<string | undefined> {
    return this.instances.get(logicalShard);
  }

  async listPlacements(region: string): Promise<readonly TenantPlacement[]> {
    return [...this.placements.values()].filter(
      (placement) => placement.region === region,
    );
  }

  /**
   * Check and write run without awaiting in between, so they are atomic inside this process.
   * @throws ShardingError `InvalidConfiguration` when the new version is not `expectedVersion + 1` (or 1).
   */
  async putPlacement(
    placement: TenantPlacement,
    expectedVersion: number | undefined,
  ): Promise<DirectoryWriteResult> {
    const nextVersion = (expectedVersion ?? 0) + 1;
    if (placement.version !== nextVersion) {
      throw new ShardingError(
        ShardingErrorCode.InvalidConfiguration,
        'placement.version must be expectedVersion + 1, or 1 for a new tenant',
        { details: { option: 'version' } },
      );
    }
    const stored = this.placements.get(placement.tenantId);
    if (stored?.version !== expectedVersion) {
      return DirectoryWriteResult.VersionConflict;
    }
    if (this.breaksExclusivity(placement)) {
      return DirectoryWriteResult.ShardTaken;
    }
    this.placements.set(placement.tenantId, placement);
    return DirectoryWriteResult.Written;
  }

  private breaksExclusivity(placement: TenantPlacement): boolean {
    for (const other of this.placements.values()) {
      if (other.tenantId === placement.tenantId) {
        continue;
      }
      const shares = other.shardGroup.some((shard) =>
        placement.shardGroup.includes(shard),
      );
      if (shares && (placement.dedicated || other.dedicated)) {
        return true;
      }
    }
    return false;
  }
}
