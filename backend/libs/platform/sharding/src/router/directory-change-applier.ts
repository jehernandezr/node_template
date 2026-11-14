import { ShardingError } from '../errors/sharding-error.js';
import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import { ShardingGuard } from '../errors/sharding-guard.js';
import { ShardDirectoryChangeKind } from '../model/shard-directory-change-kind.enum.js';
import type { ShardDirectoryChanged } from '../model/shard-directory-changed.js';
import type { InstanceResolver } from './instance-resolver.js';
import type { InvalidationLog } from './invalidation-log.js';
import type { PlacementCache } from './placement-cache.js';
import type { RoutingKeyNormalizer } from './routing-key-normalizer.js';

/** Aplica en este proceso un cambio del directorio publicado por otro. */
export class DirectoryChangeApplier {
  constructor(
    private readonly cache: PlacementCache,
    private readonly instances: InstanceResolver,
    private readonly invalidations: InvalidationLog,
    private readonly normalizer: RoutingKeyNormalizer,
    private readonly onError: (error: unknown) => void,
  ) {}

  /**
   * Solo cambia el estado en proceso: quien publicó ya dejó la lápida en el caché compartido.
   * - Placement con `version`: descarta el placement cacheado salvo que ya esté en esa versión o
   *   una mayor, y desde entonces ignora los más viejos.
   * - Placement sin `version`: descarta el placement cacheado.
   * - Instancia de un shard: descarta la instancia cacheada.
   * Nunca lanza por un evento malo: lo informa a `onError` y lo ignora.
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
