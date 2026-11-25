import { ShardingGuard } from './errors/sharding-guard.js';
import { DirectoryWriteResult } from './model/directory-write-result.enum.js';
import type { TenantPlacement } from './model/tenant-placement.js';
import type {
  AvailableShard,
  PlacementRequest,
  ShardPlacementPolicy,
} from './placement-policy.js';
import type { DirectoryWriter } from './ports/directory-writer.js';

/** Result of {@link TenantPlacer.place}. */
export type TenantPlacementResult =
  | { readonly placed: true; readonly placement: TenantPlacement }
  | { readonly placed: false; readonly conflict: DirectoryWriteResult };

/**
 * Places new tenants: reads the region, asks the policy and writes the
 * answer with `DirectoryWriter.putPlacement`. When a concurrent writer wins
 * (`VersionConflict` or `ShardTaken`), it reads again and asks
 * the policy again, up to `maxAttempts`. A tenant that already has a placement gets it
 * back, so the sign-up saga can retry this step safely.
 */
export class TenantPlacer {
  static readonly DEFAULT_MAX_ATTEMPTS = 3;

  /**
   * @param maxAttempts Attempts before giving up when concurrent writers keep winning.
   * @throws ShardingError `InvalidConfiguration` when `maxAttempts` is not a positive integer.
   */
  constructor(
    private readonly policy: ShardPlacementPolicy,
    private readonly directory: DirectoryWriter,
    private readonly maxAttempts = TenantPlacer.DEFAULT_MAX_ATTEMPTS,
  ) {
    ShardingGuard.instance.positiveInteger('maxAttempts', maxAttempts);
  }

  /**
   * @throws ShardingError from the policy, for example `UnknownShard` when the region has no suitable shard.
   */
  async place(
    request: PlacementRequest,
    availableShards: readonly AvailableShard[],
  ): Promise<TenantPlacementResult> {
    let conflict = DirectoryWriteResult.VersionConflict;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const current = await this.directory.listPlacements(request.region);
      const existing = current.find(
        (placement) => placement.tenantId === request.tenantId,
      );
      if (existing !== undefined) {
        return { placed: true, placement: existing };
      }
      const placement = this.policy.place(request, current, availableShards);
      const result = await this.directory.putPlacement(placement, undefined);
      if (result === DirectoryWriteResult.Written) {
        return { placed: true, placement };
      }
      conflict = result;
    }
    return { placed: false, conflict };
  }
}
