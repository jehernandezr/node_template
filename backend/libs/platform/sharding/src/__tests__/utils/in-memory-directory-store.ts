import { ShardingError } from '../../errors/sharding-error.js';
import { ShardingErrorCode } from '../../errors/sharding-error-code.enum.js';
import { DirectoryWriteResult } from '../../model/directory-write-result.enum.js';
import type { TenantPlacement } from '../../model/tenant-placement.js';
import { DirectoryStore } from '../../ports/directory-store.js';
import { DirectoryWriter } from '../../ports/directory-writer.js';

/**
 * In-memory directory that implements {@link DirectoryStore} and {@link DirectoryWriter}, meant for
 * tests and local environments. Conditional writes follow the {@link DirectoryWriter} contract;
 * the plain setters validate nothing.
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

  async readPlacement(tenantId: string): Promise<TenantPlacement | undefined> {
    return this.placements.get(tenantId);
  }

  async listPlacements(region: string): Promise<readonly TenantPlacement[]> {
    return [...this.placements.values()].filter(
      (placement) => placement.region === region,
    );
  }

  /**
   * The check and the write happen without awaiting between them, so they are atomic within the process.
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

  async deletePlacement(
    tenantId: string,
    expectedVersion: number,
  ): Promise<DirectoryWriteResult> {
    if (this.placements.get(tenantId)?.version !== expectedVersion) {
      return DirectoryWriteResult.VersionConflict;
    }
    this.placements.delete(tenantId);
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
