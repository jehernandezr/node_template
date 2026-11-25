import {
  Redactor,
  TraceContextRestorer,
  Tracing,
} from '@platform/observability';
import { FailureClassifier } from '@platform/primitives';
import { MessageKind } from '../contracts/message-contract.js';
import type {
  MessageDefinition,
  MessageOutput,
} from '../contracts/message-contract.js';
import { EnvelopeParser } from '../envelope/envelope-parser.js';
import { EnvelopeValidator } from '../envelope/envelope-validator.js';
import type { MessageEnvelope } from '../envelope/message-envelope.js';
import { MessagingError } from '../errors/messaging-error.js';
import { MessagingErrorCode } from '../errors/messaging-error-code.enum.js';
import { MessagingGuard } from '../errors/messaging-guard.js';
import { ClaimGuard } from './claim-guard.js';
import { DeliveryClassifier } from './delivery-classifier.js';
import { DeliveryExecution } from './delivery-execution.js';
import { DispatchOutcome } from './dispatch-outcome.enum.js';
import type { DispatchOptions } from './dispatch-options.js';
import type { DispatchResult } from './dispatch-result.js';
import { HandlerRegistry, type Registration } from './handler-registry.js';
import type {
  MessageDispatcherOptions,
  MessageDispatcherParts,
} from './message-dispatcher-options.js';
import type { MessageHandler } from './message-handler.js';
import { TenantGate } from './tenant-gate.js';

/**
 * Validates and dispatches raw deliveries to their handlers: size and envelope,
 * tenant, payload, idempotency claim and execution. Each step that fails
 * decides whether the delivery goes to the dead-letter queue, is ignored or is retried.
 */
export class MessageDispatcher {
  private readonly registry = new HandlerRegistry();
  private readonly claimGuard: ClaimGuard;
  private readonly tenantGate: TenantGate;
  private readonly classifier: DeliveryClassifier;
  private readonly parser = new EnvelopeParser(new EnvelopeValidator());
  private readonly execution: DeliveryExecution;
  private readonly queueRetryPolicy: DispatchOptions['retryPolicy'];

  constructor(
    private readonly options: MessageDispatcherOptions,
    parts: MessageDispatcherParts,
  ) {
    const guard = MessagingGuard.instance;
    if (options.minLeaseMs !== undefined) {
      guard.positiveInteger('minLeaseMs', options.minLeaseMs);
    }
    if (options.leaseMarginMs !== undefined) {
      guard.nonNegativeFinite('leaseMarginMs', options.leaseMarginMs);
    }
    const queue = options.topology?.queues.find(
      (q) => q.name === options.consumer,
    );
    this.queueRetryPolicy = queue?.retryPolicy;
    const baseLeaseMs =
      options.minLeaseMs ??
      (queue
        ? Math.ceil(queue.visibilityTimeoutSeconds * 1000)
        : ClaimGuard.DEFAULT_LEASE_MS);

    const tracing = parts.tracing ?? new Tracing(new Redactor());
    this.claimGuard = new ClaimGuard(options.processed, options.clock, guard, {
      baseLeaseMs,
      ...(options.leaseMarginMs === undefined
        ? {}
        : { leaseMarginMs: options.leaseMarginMs }),
    });
    this.tenantGate = new TenantGate(
      options.expectedTenantId,
      options.verifyTenant,
    );
    this.classifier = new DeliveryClassifier(
      parts.failures ?? new FailureClassifier(),
      parts.random,
      options.isPermanent,
    );
    this.execution = new DeliveryExecution(
      this.claimGuard,
      this.classifier,
      tracing,
      parts.restorer ?? new TraceContextRestorer(tracing),
      options.runInContext,
      options.consumer,
    );
  }

  /**
   * Registers the handler of an event or command from the contracts kit
   * (`defineEvent`, `defineCommand`). One handler per type.
   */
  register<M extends MessageDefinition>(
    contract: M,
    handler: MessageHandler<MessageOutput<M>>,
  ): this {
    this.registry.register(contract, handler);
    return this;
  }

  /**
   * Processes a raw delivery (JSON as text or a decoded value) and
   * reports what the transport must do with it. The handler runs in a
   * consumer span that continues the envelope `traceparent`.
   */
  async dispatch(
    raw: unknown,
    options: DispatchOptions,
  ): Promise<DispatchResult> {
    const effective: DispatchOptions =
      options.retryPolicy === undefined && this.queueRetryPolicy !== undefined
        ? { ...options, retryPolicy: this.queueRetryPolicy }
        : options;

    let envelope: MessageEnvelope;
    try {
      envelope = this.parser.parse(raw);
    } catch (err) {
      return this.rejected(err as MessagingError);
    }

    const registration = this.registry.find(envelope.type);
    if (!registration) return this.unhandled(envelope);

    return this.deliver(envelope, registration, effective);
  }

  private async deliver(
    envelope: MessageEnvelope,
    registration: Registration,
    options: DispatchOptions,
  ): Promise<DispatchResult> {
    let rejection: MessagingError | undefined;
    try {
      rejection = await this.tenantGate.check(envelope, options);
    } catch (err) {
      return this.classifier.failure(envelope.id, err, options, true);
    }
    if (rejection) return this.rejected(rejection, envelope.id);

    const delivery = registration.prepare(envelope);
    if (typeof delivery === 'string') {
      return {
        outcome: DispatchOutcome.DeadLetter,
        id: envelope.id,
        error: `invalid data: ${delivery}`,
        code: MessagingErrorCode.InvalidPayload,
      };
    }

    let fingerprint: string;
    try {
      fingerprint = this.claimGuard.fingerprint(envelope);
    } catch (err) {
      return this.rejected(err as MessagingError, envelope.id);
    }

    return this.execution.execute(envelope, delivery, fingerprint, options);
  }

  /** Sends to the dead-letter queue because of a platform error; without `id` if the envelope could not be read. */
  private rejected(failure: MessagingError, id?: string): DispatchResult {
    return {
      outcome: DispatchOutcome.DeadLetter,
      ...(id === undefined ? {} : { id }),
      error: failure.message,
      code: failure.code,
    };
  }

  /** A type without a handler: an event is ignored; a command goes to the dead-letter queue. */
  private unhandled(envelope: MessageEnvelope): DispatchResult {
    const kind = this.options.topology?.routeFor(envelope.type)?.kind;
    if (kind === MessageKind.Event) {
      return {
        outcome: DispatchOutcome.Ignored,
        id: envelope.id,
        type: envelope.type,
      };
    }
    return {
      outcome: DispatchOutcome.DeadLetter,
      id: envelope.id,
      error: `no handler registered for type "${envelope.type}"`,
      code: MessagingErrorCode.UnknownRoute,
    };
  }
}
