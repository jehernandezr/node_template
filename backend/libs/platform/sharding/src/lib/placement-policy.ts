import { ShardingError, ShardingErrorCode } from './errors.js';
import { DirectoryWriteResult, type DirectoryWriter } from './ports.js';
import { TenantStatus, type TenantPlacement } from './types.js';

/** Request to place a new tenant. */
export interface PlacementRequest {
  readonly tenantId: string;
  readonly region: string;
  /** When true, the tenant gets a shard that no other tenant uses, and no one else may use it later. */
  readonly dedicated: boolean;
}

/** A logical shard that can receive tenants, with its region. */
export interface AvailableShard {
  readonly region: string;
  readonly shard: string;
}

/**
 * Decides where a new tenant is placed (`ShardPlacementPolicy` of the plan): the least loaded shard, the
 * tenant's region or a dedicated shard. Policies are pure; {@link placeTenant} writes their answer with a
 * conditional write, so two concurrent sign-ups cannot both take the same shard.
 */
export interface ShardPlacementPolicy {
  place(
    request: PlacementRequest,
    current: readonly TenantPlacement[],
    availableShards: readonly AvailableShard[],
  ): TenantPlacement;
}

/**
 * Places tenants on the shard of the region with the fewest tenants (load = tenants per shard).
 *
 * - Idempotent: a tenant already in `current` gets its existing placement back, so retries are safe.
 * - Dedicated tenants only take shards with no tenants at all.
 * - Shards used by a dedicated tenant are excluded for everyone else.
 * - Ties go to the shard listed first.
 *
 * @throws ShardingError `UnknownShard` when no suitable shard exists in the region.
 */
export class LeastLoadedPlacementPolicy implements ShardPlacementPolicy {
  place(
    request: PlacementRequest,
    current: readonly TenantPlacement[],
    availableShards: readonly AvailableShard[],
  ): TenantPlacement {
    const existing = current.find(
      (placement) => placement.tenantId === request.tenantId,
    );
    if (existing !== undefined) {
      return existing;
    }

    const regionShards = availableShards.filter(
      (candidate) => candidate.region === request.region,
    );
    if (regionShards.length === 0) {
      throw new ShardingError(
        ShardingErrorCode.UnknownShard,
        'No shards available in region',
        { details: { region: request.region } },
      );
    }

    const load = new Map<string, number>();
    const dedicatedShards = new Set<string>();
    for (const placement of current) {
      if (placement.region !== request.region) {
        continue;
      }
      for (const shard of placement.shardGroup) {
        load.set(shard, (load.get(shard) ?? 0) + 1);
        if (placement.dedicated) {
          dedicatedShards.add(shard);
        }
      }
    }

    let chosen: { shard: string; tenants: number } | undefined;
    for (const candidate of regionShards) {
      const tenants = load.get(candidate.shard) ?? 0;
      const excluded = request.dedicated
        ? tenants > 0
        : dedicatedShards.has(candidate.shard);
      if (excluded) {
        continue;
      }
      if (chosen === undefined || tenants < chosen.tenants) {
        chosen = { shard: candidate.shard, tenants };
      }
    }

    if (chosen === undefined) {
      const kind = request.dedicated
        ? 'free shard for a dedicated tenant'
        : 'shard for a tenant';
      throw new ShardingError(ShardingErrorCode.UnknownShard, `No ${kind}`, {
        details: { region: request.region, tenantId: request.tenantId },
      });
    }

    return {
      tenantId: request.tenantId,
      region: request.region,
      shardGroup: [chosen.shard],
      status: TenantStatus.Active,
      version: 1,
      dedicated: request.dedicated,
    };
  }
}

/** Arguments of {@link placeTenant}. */
export interface PlaceTenantOptions {
  readonly policy: ShardPlacementPolicy;
  readonly directory: DirectoryWriter;
  readonly request: PlacementRequest;
  readonly availableShards: readonly AvailableShard[];
  /** Attempts before giving up when concurrent writers keep winning. Default 3. */
  readonly maxAttempts?: number;
}

/** Outcome of {@link placeTenant}. */
export type PlaceTenantResult =
  | { readonly placed: true; readonly placement: TenantPlacement }
  | { readonly placed: false; readonly conflict: DirectoryWriteResult };

/**
 * Places a new tenant: reads the region, asks the policy and writes the answer with
 * `DirectoryWriter.putPlacement`. When a concurrent writer wins (`VersionConflict` or `ShardTaken`) it reads
 * again and asks the policy again, up to `maxAttempts`. A tenant that already has a placement gets it back,
 * so the onboarding saga can retry this step safely.
 * @throws ShardingError from the policy (for example `UnknownShard` when the region has no suitable shard),
 *   or `InvalidConfiguration` when `maxAttempts` is not a positive integer.
 */
export async function placeTenant(
  options: PlaceTenantOptions,
): Promise<PlaceTenantResult> {
  const maxAttempts = options.maxAttempts ?? 3;
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) {
    throw new ShardingError(
      ShardingErrorCode.InvalidConfiguration,
      'maxAttempts must be a positive integer',
      { details: { option: 'maxAttempts' } },
    );
  }
  let conflict = DirectoryWriteResult.VersionConflict;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const current = await options.directory.listPlacements(
      options.request.region,
    );
    const existing = current.find(
      (placement) => placement.tenantId === options.request.tenantId,
    );
    if (existing !== undefined) {
      return { placed: true, placement: existing };
    }
    const placement = options.policy.place(
      options.request,
      current,
      options.availableShards,
    );
    const result = await options.directory.putPlacement(placement, undefined);
    if (result === DirectoryWriteResult.Written) {
      return { placed: true, placement };
    }
    conflict = result;
  }
  return { placed: false, conflict };
}
