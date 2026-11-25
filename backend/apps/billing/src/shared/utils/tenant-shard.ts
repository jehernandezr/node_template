import { Injectable } from '@nestjs/common';
import { RequestContextStore } from '@platform/observability';
import { ShardScope } from '@platform/persistence';
import { ShardKey } from '@platform/sharding';

/**
 * Runs a block on the tenant shard with that tenant in the context, which persistence sets in
 * `app.tenant_id`: the RLS of the tenant tables shows no row without it.
 */
@Injectable()
export class TenantShard {
  constructor(
    private readonly scope: ShardScope,
    private readonly context: RequestContextStore,
  ) {}

  run<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    return this.context.run({ ...this.context.current(), tenantId }, () =>
      this.scope.run({ tenantId, keyKind: ShardKey.Tenant }, fn),
    );
  }
}
