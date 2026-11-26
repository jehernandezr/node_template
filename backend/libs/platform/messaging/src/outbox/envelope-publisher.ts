import type { MessageEnvelope } from '../envelope/message-envelope.js';
import type { OutboundTarget, PublishOutboxOptions } from './outbox.js';

/** Port that sends an envelope to a topic or a queue. */
export abstract class EnvelopePublisher {
  /**
   * Publishes an envelope to its topic or queue.
   * @param envelope Envelope to publish.
   * @param target Topic or queue.
   * @param options Group and deduplication.
   */
  abstract publish(
    envelope: MessageEnvelope,
    target: OutboundTarget,
    options: PublishOutboxOptions,
  ): Promise<void>;
}
