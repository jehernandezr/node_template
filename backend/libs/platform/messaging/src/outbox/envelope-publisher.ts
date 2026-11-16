import type { MessageEnvelope } from '../envelope/message-envelope.js';
import type { OutboundTarget, PublishOutboxOptions } from './outbox.js';

/** Puerto que envía un sobre a un tópico o a una cola. */
export abstract class EnvelopePublisher {
  abstract publish(
    envelope: MessageEnvelope,
    target: OutboundTarget,
    options: PublishOutboxOptions,
  ): Promise<void>;
}
