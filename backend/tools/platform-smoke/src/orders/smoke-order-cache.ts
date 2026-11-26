import { Inject, Injectable } from '@nestjs/common';
import { CacheAside } from '@platform/cache';
import { cacheAsideToken } from '@platform/cache/nest';
import { ShardScopes } from '@platform/persistence';
import { SmokeCacheNamespace } from './smoke-cache-namespace.enum.js';
import { SmokeOrderRepository } from './smoke-order.repository.js';
import type { SmokeOrderView } from './smoke-order-view.js';

/** Cached order reads: keys go under the tenant, so invalidating one does not touch another. */
@Injectable()
export class SmokeOrderCache {
  private static readonly TTL_MS = 60_000;

  constructor(
    @Inject(cacheAsideToken(SmokeCacheNamespace.Orders))
    private readonly aside: CacheAside,
    private readonly orders: SmokeOrderRepository,
    private readonly scopes: ShardScopes,
  ) {}

  async read(
    tenantId: string,
    orderId: string,
  ): Promise<SmokeOrderView | null> {
    return this.aside.getOrLoad<SmokeOrderView | null>({
      namespace: [tenantId, SmokeCacheNamespace.OrdersPart],
      params: { orderId },
      ttlMs: SmokeOrderCache.TTL_MS,
      load: async () => {
        const order = await this.scopes.inTenantShard(tenantId, () =>
          this.orders.findById(orderId),
        );
        return order === null
          ? null
          : { id: order.id, customer: order.customer, status: order.status };
      },
    });
  }

  invalidate(tenantId: string): Promise<void> {
    return this.aside.invalidate([tenantId, SmokeCacheNamespace.OrdersPart]);
  }
}
