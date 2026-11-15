import { MessagingError } from '../../errors/messaging-error.js';
import { MessagingErrorCode } from '../../errors/messaging-error-code.enum.js';
import type { MessageEnvelope } from '../../envelope/message-envelope.js';
import { EnvelopePublisher } from '../../outbox/envelope-publisher.js';
import type {
  OutboundTarget,
  PublishOutboxOptions,
} from '../../outbox/outbox.js';

/** Una publicación aceptada por {@link RecordingEnvelopePublisher}. */
export interface PublishedEnvelope {
  readonly envelope: MessageEnvelope;
  readonly target: OutboundTarget;
  readonly options: PublishOutboxOptions;
}

/**
 * Publicador de prueba que guarda lo publicado. Los sobres cuyo id está en
 * `failing` lanzan `error`, así una prueba decide qué falla sin espías.
 */
export class RecordingEnvelopePublisher extends EnvelopePublisher {
  readonly published: PublishedEnvelope[] = [];
  readonly failing = new Set<string>();
  /** Error que lanzan los sobres de `failing`. Es reintentable por defecto. */
  error: unknown = new MessagingError(
    MessagingErrorCode.TransportFailed,
    'transport down',
    { retryable: true },
  );
  /** Intentos de publicación, sin importar si fallaron. */
  attempts = 0;

  publish(
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
