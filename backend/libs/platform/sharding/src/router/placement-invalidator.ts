import { ShardingGuard } from '../errors/sharding-guard.js';
import { ShardingEvent } from '../model/sharding-event.enum.js';
import { ShardDirectoryChangeKind } from '../model/shard-directory-change-kind.enum.js';
import type { ShardDirectoryChanged } from '../model/shard-directory-changed.js';
import type { ShardDirectoryChangePublisher } from '../ports/shard-directory-change-publisher.js';
import type { InstanceResolver } from './instance-resolver.js';
import type { InvalidateOptions } from './invalidate-options.js';
import type { InvalidationLog } from './invalidation-log.js';
import type { PlacementCache } from './placement-cache.js';
import { PlacementCodec } from './placement-codec.js';
import type { RoutingKeyNormalizer } from './routing-key-normalizer.js';
import { SharedRecordKind } from './shared-record-kind.enum.js';

/** Invalida el placement de un tenant en todos los niveles y avisa a los demás procesos. */
export class PlacementInvalidator {
  constructor(
    private readonly cache: PlacementCache,
    private readonly instances: InstanceResolver,
    private readonly invalidations: InvalidationLog,
    private readonly normalizer: RoutingKeyNormalizer,
    private readonly publisher: ShardDirectoryChangePublisher | undefined,
    private readonly onError: (error: unknown) => void,
  ) {}

  /**
   * Descarta el placement en proceso y las instancias de su grupo de shards, reemplaza la
   * entrada compartida por una lápida versionada y publica
   * `ShardingEvent.ShardDirectoryChanged`. Una falla del caché o del canal se informa a
   * `onError` y no la lanza.
   * @throws ShardingError `KeyMissing` o `InvalidTenantId` por un id malo; `InvalidConfiguration`
   *   si `options.version` no es un entero no negativo.
   */
  async invalidate(
    tenantId: string,
    options: InvalidateOptions,
  ): Promise<void> {
    const id = this.normalizer.tenantId(tenantId);
    const { version } = options;
    if (version !== undefined) {
      ShardingGuard.instance.nonNegativeInteger('version', version);
    }
    this.invalidations.mark(id);
    if (version !== undefined) {
      this.cache.raiseMinVersion(id, version);
    }
    const local = this.cache.local(id);
    this.cache.drop(id);
    const shared = await this.cache.readShared(id);
    const group =
      local?.shardGroup ??
      (shared?.kind === SharedRecordKind.Placement
        ? shared.entry.placement.shardGroup
        : []);
    for (const shard of group) {
      this.instances.invalidate(shard);
    }
    await this.cache.writeTombstone(
      id,
      PlacementCodec.tombstoneVersion(local, shared, version),
    );
    await this.publish({
      type: ShardingEvent.ShardDirectoryChanged,
      kind: ShardDirectoryChangeKind.TenantPlacement,
      tenantId: id,
      ...(version === undefined ? {} : { version }),
    });
  }

  private async publish(event: ShardDirectoryChanged): Promise<void> {
    if (this.publisher === undefined) {
      return;
    }
    try {
      await this.publisher.publish(event);
    } catch (error) {
      this.onError(error);
    }
  }
}
