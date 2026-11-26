import { MessagingError } from '../../errors/messaging-error.js';
import { MessagingErrorCode } from '../../errors/messaging-error-code.enum.js';
import type { MessageEnvelope } from '../../envelope/message-envelope.js';
import { EnvelopePublisher } from '../../outbox/envelope-publisher.js';
import type {
  OutboundTarget,
  PublishOutboxOptions,
} from '../../outbox/outbox.js';

/** A publication accepted by {@link RecordingEnvelopePublisher}. */
export interface PublishedEnvelope {
  readonly envelope: MessageEnvelope;
  readonly target: OutboundTarget;
  readonly options: PublishOutboxOptions;
}

/**
 * Test publisher that stores what was published. Envelopes whose id is in
 * `failing` throw `error`, so a test decides what fails without spies.
 */
export class RecordingEnvelopePublisher extends EnvelopePublisher {
  readonly published: PublishedEnvelope[] = [];
  readonly failing = new Set<string>();
  /** Error thrown by the envelopes in `failing`. Retryable by default. */
  error: unknown = new MessagingError(
    MessagingErrorCode.TransportFailed,
    'transport down',
    { retryable: true },
  );
  /** Publication attempts, whether or not they failed. */
  attempts = 0;

  override publish(
    envelope: MessageEnvelope,
    target: OutboundTarget,
    options: PublishOutboxOptions,
  ): Promise<void> {
    this.attempts += 1;
    if (this.failing.has(envelope.id)) {
      return Promise.reject(this.error as Error);
    }
    this.published.push({ envelope, target, options });
    return Promise.resolve();
  }
}
