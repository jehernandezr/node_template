import { Injectable } from '@nestjs/common';
import { TransactionManager } from '@platform/kernel';
import { ShardScopes } from '@platform/persistence';
import { SmokeOrderCache } from './smoke-order-cache.js';
import { SmokeOrderRepository } from './smoke-order.repository.js';
import type { SmokeOrderStatus } from './smoke-order-status.enum.js';

/**
 * Changes the status of an order. The cache entry is invalidated only after the commit: a reader that
 * arrives earlier sees the previous value, never one the transaction could roll back.
 */
@Injectable()
export class ChangeSmokeOrderStatus {
  constructor(
    private readonly transactions: TransactionManager,
    private readonly orders: SmokeOrderRepository,
    private readonly cache: SmokeOrderCache,
    private readonly scopes: ShardScopes,
  ) {}

  /**
   * Changes the status of an order and invalidates its cache.
   * @param input Tenant, order and status.
   */
  async execute(input: {
    readonly tenantId: string;
    readonly orderId: string;
    readonly status: SmokeOrderStatus;
  }): Promise<void> {
    await this.scopes.inTenantShard(input.tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const current = await this.orders.findById(input.orderId);
        if (current === null) {
          return;
        }
        await this.orders.save(current.withStatus(input.status));
        this.transactions.afterCommit(() =>
          this.cache.invalidate(input.tenantId),
        );
      }),
    );
  }
}
