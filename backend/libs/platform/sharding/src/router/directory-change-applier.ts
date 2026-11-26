import { ShardingError } from '../errors/sharding-error.js';
import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import { ShardingGuard } from '../errors/sharding-guard.js';
import { ShardDirectoryChangeKind } from '../model/shard-directory-change-kind.enum.js';
import type { ShardDirectoryChanged } from '../model/shard-directory-changed.js';
import type { InstanceResolver } from './instance-resolver.js';
import type { InvalidationLog } from './invalidation-log.js';
import type { PlacementCache } from './placement-cache.js';
import type { RoutingKeyNormalizer } from './routing-key-normalizer.js';

/** Applies in this process a directory change published by another one. */
export class DirectoryChangeApplier {
  constructor(
    private readonly cache: PlacementCache,
    private readonly instances: InstanceResolver,
    private readonly invalidations: InvalidationLog,
    private readonly normalizer: RoutingKeyNormalizer,
    private readonly onError: (error: unknown) => void,
  ) {}

  /**
   * Only changes in-process state: the publisher already left the tombstone in the shared cache.
   * - Placement with `version`: discards the cached placement unless it is already at that version or
   *   a higher one, and from then on ignores older ones.
   * - Placement without `version`: discards the cached placement.
   * - Shard instance: discards the cached instance.
   * Never throws on a bad event: reports it to `onError` and ignores it.
   * @param event Directory change.
   */
  apply(event: ShardDirectoryChanged): void {
    try {
      if (event.kind === ShardDirectoryChangeKind.ShardInstance) {
        this.applyInstance(event.logicalShard);
        return;
      }
      this.applyPlacement(event.tenantId, event.version);
    } catch (error) {
      this.onError(error);
    }
  }

  private applyInstance(logicalShard: unknown): void {
    if (typeof logicalShard !== 'string' || !logicalShard) {
      throw new ShardingError(
        ShardingErrorCode.InvalidConfiguration,
        'logicalShard must be a non-empty string',
        { details: { option: 'logicalShard' } },
      );
    }
    this.instances.invalidate(logicalShard);
  }

  private applyPlacement(tenantId: string, version: number | undefined): void {
    const id = this.normalizer.tenantId(tenantId);
    if (version !== undefined) {
      ShardingGuard.instance.nonNegativeInteger('version', version);
      const local = this.cache.local(id);
      if (local !== undefined && local.version >= version) {
        return;
      }
      this.cache.raiseMinVersion(id, version);
    }
    this.invalidations.mark(id);
    this.cache.drop(id);
  }
}
