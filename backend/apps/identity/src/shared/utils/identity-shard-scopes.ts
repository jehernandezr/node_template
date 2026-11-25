import { Injectable } from '@nestjs/common';
import { RequestContextStore } from '@platform/observability';
import { ShardScope } from '@platform/persistence';
import { ShardKey } from '@platform/sharding';
import type { UserRef } from '../types/user-ref.type.js';

/**
 * Runs a block in the user's or the tenant's shard. This way a use case does not build shard keys by hand
 * and the shard of each operation always comes from the same place.
 */
@Injectable()
export class IdentityShardScopes {
  constructor(
    private readonly scope: ShardScope,
    private readonly context: RequestContextStore,
  ) {}

  /** Runs the block in the user's shard, which lives in the shard of their home tenant. */
  inUserShard<T>(ref: UserRef, fn: () => Promise<T>): Promise<T> {
    return this.scope.run(
      {
        tenantId: ref.homeTenantId,
        keyKind: ShardKey.User,
        keyValue: ref.userId,
      },
      fn,
    );
  }

  /**
   * Runs the block in the tenant's shard and with that tenant in the context: persistence sets it in
   * `app.tenant_id` when opening each transaction, `TenantIsolatedRepository` also sets it on each read, and the
   * RLS policies of the tenant tables do not show any row without it.
   * Identity works on tenants that are not the session's (accepting an invitation, switching tenants,
   * the internal operations), so the context tenant is the block's, not the caller's.
   */
  inTenantShard<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    const current = this.context.current();
    return this.context.run({ ...current, tenantId }, () =>
      this.scope.run({ tenantId, keyKind: ShardKey.Tenant }, fn),
    );
  }
}
