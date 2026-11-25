import type { MessageEnvelope } from '../envelope/message-envelope.js';
import type { OutboundTarget, PublishOutboxOptions } from './outbox.js';

/** Port that sends an envelope to a topic or a queue. */
export abstract class EnvelopePublisher {
  abstract publish(
    envelope: MessageEnvelope,
    target: OutboundTarget,
    options: PublishOutboxOptions,
  ): Promise<void>;
}
