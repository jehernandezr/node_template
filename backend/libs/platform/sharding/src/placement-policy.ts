import type { TenantPlacement } from './model/tenant-placement.js';

/** Request to place a new tenant. */
export interface PlacementRequest {
  readonly tenantId: string;
  readonly region: string;
  /** If true, the tenant gets a shard no other tenant uses, and no one else can use it afterwards. */
  readonly dedicated: boolean;
}

/** A logical shard that can receive tenants, with its region. */
export interface AvailableShard {
  readonly region: string;
  readonly shard: string;
}

/**
 * Decides where a new tenant is placed: the least loaded shard, the tenant's
 * region or a dedicated shard. Policies are pure; `TenantPlacer` writes their
 * answer with a conditional write, so two concurrent sign-ups cannot
 * take the same shard.
 */
export abstract class ShardPlacementPolicy {
  abstract place(
    request: PlacementRequest,
    current: readonly TenantPlacement[],
    availableShards: readonly AvailableShard[],
  ): TenantPlacement;
}
