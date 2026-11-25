import type { ShardKey } from '@platform/sharding';

/** Explicit key of a `ShardScope`: the tenant that owns the data and how the shard is chosen. */
export interface ShardScopeInit {
  readonly tenantId: string;
  readonly keyKind: ShardKey;
  /** Required except with `ShardKey.Tenant`. */
  readonly keyValue?: string;
}
