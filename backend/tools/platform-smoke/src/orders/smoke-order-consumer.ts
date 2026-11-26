import { Injectable } from '@nestjs/common';
import type { MessageEnvelope } from '@platform/messaging';
import { Subscribe } from '@platform/messaging/nest';
import { SmokeOrderCreated } from './smoke-order-events.js';
import { SmokeOrderLedger } from './smoke-order-ledger.js';

/** Consumes the created orders and records them in the delivery ledger. */
@Injectable()
export class SmokeOrderConsumer {
  constructor(private readonly ledger: SmokeOrderLedger) {}

  /**
   * Records each delivery of `OrderCreated`, to check it is processed once.
   * @param _data Event payload.
   * @param envelope Event envelope.
   */
  @Subscribe(SmokeOrderCreated)
  onOrderCreated(
    _data: { readonly orderId: string; readonly customer: string },
    envelope: MessageEnvelope,
  ): Promise<void> {
    this.ledger.record(envelope.id);
    return Promise.resolve();
  }
}
