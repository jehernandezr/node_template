import type { ShardKey } from '@platform/sharding';

/** How the service routes its data by default. */
export interface ServiceSharding {
  /** Key of the transactions that do not declare their own. */
  readonly defaultKey: ShardKey;
  /** With `true`, without an active `ShardScope` every resolution fails with `PLATFORM.SHARDING.KEY_MISSING`. */
  readonly requireScope: boolean;
}
