import { Injectable } from '@nestjs/common';
import {
  EnvelopePublisher,
  type MessageEnvelope,
  type OutboundTarget,
  type PublishOutboxOptions,
} from '@platform/messaging';
import { InMemoryBus } from '@platform/messaging/test-utils';

/** El publicador del relay de cada servicio: deja el sobre en el bus en memoria que comparten los cinco. */
@Injectable()
export class BusEnvelopePublisher extends EnvelopePublisher {
  constructor(private readonly bus: InMemoryBus) {
    super();
  }

  publish(
    envelope: MessageEnvelope,
    target: OutboundTarget,
    options: PublishOutboxOptions,
  ): Promise<void> {
    this.bus.accept(envelope, target, options.delayMs);
    return Promise.resolve();
  }
}
