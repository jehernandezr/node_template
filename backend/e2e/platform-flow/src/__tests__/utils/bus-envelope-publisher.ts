import { Injectable } from '@nestjs/common';
import {
  EnvelopePublisher,
  type MessageEnvelope,
  type OutboundTarget,
  type PublishOutboxOptions,
} from '@platform/messaging';
import { InMemoryBus } from '@platform/messaging/test-utils';

/** The relay publisher of each service: drops the envelope on the in-memory bus shared by all five. */
@Injectable()
export class BusEnvelopePublisher extends EnvelopePublisher {
  constructor(private readonly bus: InMemoryBus) {
    super();
  }

  override publish(
    envelope: MessageEnvelope,
    target: OutboundTarget,
    options: PublishOutboxOptions,
  ): Promise<void> {
    this.bus.accept(envelope, target, options.delayMs);
    return Promise.resolve();
  }
}
