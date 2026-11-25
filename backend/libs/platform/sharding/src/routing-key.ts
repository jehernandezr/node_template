import type { ShardKey } from './model/shard-key.enum.js';

/** Routing input of `ShardRouter.resolve`, without the access intent. */
export interface RoutingKey {
  readonly keyKind: ShardKey;
  /** `undefined` with `ShardKey.Tenant`: the router uses the tenant id. */
  readonly keyValue?: string;
}
