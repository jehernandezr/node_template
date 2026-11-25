/** Options of `ShardResolver`. */
export interface ShardResolverOptions {
  /** With `true`, without an active `ShardScope` every resolution fails with `PLATFORM.SHARDING.KEY_MISSING`. */
  readonly requireScope: boolean;
}
