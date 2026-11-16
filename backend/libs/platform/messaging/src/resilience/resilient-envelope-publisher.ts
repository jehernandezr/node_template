import { ResilienceRegistry } from '@platform/resilience';
import type { MessageEnvelope } from '../envelope/message-envelope.js';
import { EnvelopePublisher } from '../outbox/envelope-publisher.js';
import type { OutboundTarget, PublishOutboxOptions } from '../outbox/outbox.js';
import { MessagingPolicies } from './messaging-policies.js';

/**
 * Decora un publicador con la política `Queue`: cada destino (tópico o cola)
 * tiene su propio circuit breaker, así uno caído no frena a los demás.
 */
export class ResilientEnvelopePublisher extends EnvelopePublisher {
  constructor(
    private readonly inner: EnvelopePublisher,
    private readonly resilience: ResilienceRegistry,
  ) {
    super();
  }

  publish(
    envelope: MessageEnvelope,
    target: OutboundTarget,
    options: PublishOutboxOptions,
  ): Promise<void> {
    return this.resilience.execute(
      MessagingPolicies.Queue,
      () => this.inner.publish(envelope, target, options),
      { dependencyKey: `${target.kind}:${target.name}` },
    );
  }
}
