import { ResilienceRegistry } from '@platform/resilience';
import type { MessageEnvelope } from '../envelope/message-envelope.js';
import { EnvelopePublisher } from '../outbox/envelope-publisher.js';
import type { OutboundTarget, PublishOutboxOptions } from '../outbox/outbox.js';
import { MessagingPolicies } from './messaging-policies.js';

/**
 * Decorates a publisher with the `Queue` policy: each destination (topic or queue)
 * has its own circuit breaker, so one that is down does not hold back the others.
 */
export class ResilientEnvelopePublisher extends EnvelopePublisher {
  constructor(
    private readonly inner: EnvelopePublisher,
    private readonly resilience: ResilienceRegistry,
  ) {
    super();
  }

  override publish(
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
