/** Default limits of `ShardRouter`. */
export const SHARD_ROUTER_DEFAULTS = {
  localTtlMs: 60_000,
  sharedTtlMs: 300_000,
  tombstoneTtlMs: 30_000,
  maxPlacements: 10_000,
  maxInstances: 10_000,
  maxKeyLength: 256,
} as const;
