import { Injectable } from '@nestjs/common';
import type { MessageEnvelope } from '@platform/messaging';
import { Subscribe } from '@platform/messaging/nest';
import { SmokeOrderCreated } from './smoke-order-events.js';
import { SmokeOrderLedger } from './smoke-order-ledger.js';

/** Consume los pedidos creados y los registra en el libro de entregas. */
@Injectable()
export class SmokeOrderConsumer {
  constructor(private readonly ledger: SmokeOrderLedger) {}

  @Subscribe(SmokeOrderCreated)
  onOrderCreated(
    _data: { readonly orderId: string; readonly customer: string },
    envelope: MessageEnvelope,
  ): Promise<void> {
    this.ledger.record(envelope.id);
    return Promise.resolve();
  }
}
