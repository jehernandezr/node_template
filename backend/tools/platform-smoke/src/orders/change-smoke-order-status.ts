import { Injectable } from '@nestjs/common';
import { TransactionManager } from '@platform/kernel';
import { SmokeOrderCache } from './smoke-order-cache.js';
import { SmokeOrderRepository } from './smoke-order.repository.js';
import type { SmokeOrderStatus } from './smoke-order-status.enum.js';

/**
 * Cambia el estado de un pedido. La entrada del caché se invalida solo después del commit: un lector que
 * llega antes ve el valor anterior, nunca uno que la transacción podría deshacer.
 */
@Injectable()
export class ChangeSmokeOrderStatus {
  constructor(
    private readonly transactions: TransactionManager,
    private readonly orders: SmokeOrderRepository,
    private readonly cache: SmokeOrderCache,
  ) {}

  async execute(input: {
    readonly tenantId: string;
    readonly orderId: string;
    readonly status: SmokeOrderStatus;
  }): Promise<void> {
    await this.transactions.runInTransaction(async () => {
      const current = await this.orders.findById(input.orderId);
      if (current === null) {
        return;
      }
      await this.orders.save(current.withStatus(input.status));
      this.transactions.afterCommit(() =>
        this.cache.invalidate(input.tenantId),
      );
    });
  }
}
