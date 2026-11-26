import type { UserRef } from '@contracts/platform';
import type { RequestContextStore } from '@platform/observability';
import { ShardKey } from '@platform/sharding';
import type { ShardScope } from './shard-scope.js';

/**
 * Opens the shard of a tenant or of a user for a block, so a use case never builds shard keys by hand and every
 * operation takes its shard from the same place.
 */
export class ShardScopes {
  constructor(
    private readonly scope: ShardScope,
    private readonly context: RequestContextStore,
  ) {}

  /**
   * Runs the block in the tenant's shard with that tenant in the request context. Persistence sets it in
   * `app.tenant_id`, and the RLS policies of tenant tables show no row without it, so the block works on the given
   * tenant even when the caller's session belongs to another one.
   * @throws ShardingError `CrossShardTransaction` if a transaction is open on another shard.
   */
  inTenantShard<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    return this.context.run({ ...this.context.current(), tenantId }, () =>
      this.scope.run({ tenantId, keyKind: ShardKey.Tenant }, fn),
    );
  }

  /**
   * Runs the block in the user's shard, which is the shard of their home tenant. The request context is left as
   * it is: user data has no tenant column.
   * @throws ShardingError `CrossShardTransaction` if a transaction is open on another shard.
   */
  inUserShard<T>(user: UserRef, fn: () => Promise<T>): Promise<T> {
    return this.scope.run(
      {
        tenantId: user.homeTenantId,
        keyKind: ShardKey.User,
        keyValue: user.userId,
      },
      fn,
    );
  }
}
