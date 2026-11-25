import { Injectable } from '@nestjs/common';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { OutboxWriter } from '@platform/messaging';
import { EnvelopeFactory } from '@platform/messaging';
import { SmokeService } from '../smoke-service.enum.js';
import { SmokeOrder } from './smoke-order.js';
import { SmokeOrderCreated } from './smoke-order-events.js';
import { SmokeOrderRepository } from './smoke-order.repository.js';
import { SmokeOrderStatus } from './smoke-order-status.enum.js';

/** Data to register an order: the owning tenant and the customer. */
export interface RegisterSmokeOrderInput {
  readonly tenantId: string;
  readonly customer: string;
}

/**
 * Registers an order and its event in a single unit of work: the envelope enters the outbox and the row the
 * tenant's shard in the same transaction. If either write fails, neither remains.
 */
@Injectable()
export class RegisterSmokeOrder {
  constructor(
    private readonly transactions: TransactionManager,
    private readonly orders: SmokeOrderRepository,
    private readonly outbox: OutboxWriter,
    private readonly envelopes: EnvelopeFactory,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  execute(input: RegisterSmokeOrderInput): Promise<SmokeOrder> {
    return this.transactions.runInTransaction(async () => {
      const order = new SmokeOrder(
        this.ids.next().toString(),
        input.customer,
        SmokeOrderStatus.Placed,
        0,
      );
      await this.outbox.append({
        envelope: this.envelopes.create({
          type: SmokeOrderCreated.type,
          source: SmokeService.Name,
          tenantId: input.tenantId,
          data: { orderId: order.id, customer: order.customer },
        }),
        createdAt: this.clock.now(),
      });
      return this.orders.save(order);
    });
  }
}
