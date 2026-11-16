import { SystemClock, SystemRandomSource } from '@platform/kernel';
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
 * Valida y despacha las entregas crudas a sus manejadores: tamaño y sobre,
 * tenant, payload, claim de idempotencia y ejecución. Cada paso que falla
 * decide si la entrega va a la cola de errores, se ignora o se reintenta.
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
    parts: MessageDispatcherParts = {},
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
    this.claimGuard = new ClaimGuard(
      options.processed,
      options.clock ?? new SystemClock(),
      guard,
      {
        baseLeaseMs,
        ...(options.leaseMarginMs === undefined
          ? {}
          : { leaseMarginMs: options.leaseMarginMs }),
      },
    );
    this.tenantGate = new TenantGate(
      options.expectedTenantId,
      options.verifyTenant,
    );
    this.classifier = new DeliveryClassifier(
      parts.failures ?? new FailureClassifier(),
      parts.random ?? new SystemRandomSource(),
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
   * Registra el manejador de un evento o comando del kit de contratos
   * (`defineEvent`, `defineCommand`). Un manejador por tipo.
   */
  register<M extends MessageDefinition>(
    contract: M,
    handler: MessageHandler<MessageOutput<M>>,
  ): this {
    this.registry.register(contract, handler);
    return this;
  }

  /**
   * Procesa una entrega cruda (un JSON como texto o un valor decodificado) e
   * informa qué debe hacer el transporte con ella. El manejador corre en un
   * span de consumidor que continúa el `traceparent` del sobre.
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

  /** Entrega a la cola de errores por un error de la plataforma; sin `id` si el sobre no se pudo leer. */
  private rejected(failure: MessagingError, id?: string): DispatchResult {
    return {
      outcome: DispatchOutcome.DeadLetter,
      ...(id === undefined ? {} : { id }),
      error: failure.message,
      code: failure.code,
    };
  }

  /** Un tipo sin manejador: un evento se ignora; un comando va a la cola de errores. */
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
