import { Injectable } from '@nestjs/common';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { OutboxWriter } from '@platform/messaging';
import { EnvelopeFactory } from '@platform/messaging';
import { SmokeService } from '../smoke-service.enum.js';
import { SmokeOrder } from './smoke-order.js';
import { SmokeOrderCreated } from './smoke-order-events.js';
import { SmokeOrderRepository } from './smoke-order.repository.js';
import { SmokeOrderStatus } from './smoke-order-status.enum.js';

/** Datos para registrar un pedido: el tenant dueño y el cliente. */
export interface RegisterSmokeOrderInput {
  readonly tenantId: string;
  readonly customer: string;
}

/**
 * Registra un pedido y su evento en una sola unidad de trabajo: el sobre entra al outbox y la fila al
 * shard del tenant en la misma transacción. Si cualquiera de las dos escrituras falla, no queda ninguna.
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
