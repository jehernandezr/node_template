import { context, SpanKind } from '@opentelemetry/api';
import type { TraceContextRestorer, Tracing } from '@platform/observability';
import { MessagingOperationType } from './messaging-operation-type.enum.js';
import { MessagingSpanAttribute } from './messaging-span-attribute.enum.js';
import type { MessageEnvelope } from '../envelope/message-envelope.js';
import type { ClaimGuard } from './claim-guard.js';
import {
  ClaimOutcomeKind,
  type AcquiredMessageClaim,
} from './claim-outcome.js';
import type { DeliveryClassifier } from './delivery-classifier.js';
import type { DispatchOptions } from './dispatch-options.js';
import type { DispatchResult } from './dispatch-result.js';
import { DispatchOutcome } from './dispatch-outcome.enum.js';
import type { MessageDispatcherOptions } from './message-dispatcher-options.js';
import type { PreparedDelivery } from './handler-registry.js';

/** Hasta dónde llegó la ejecución, para decidir qué significa un error. */
enum Stage {
  /** Abriendo el contexto o tomando el claim: falla de infraestructura. */
  Claim = 'claim',
  Handler = 'handler',
  Complete = 'complete',
  Done = 'done',
}

interface RunState {
  stage: Stage;
  claim: AcquiredMessageClaim | undefined;
  /** Se fija cuando el claim decidió el resultado sin correr el manejador. */
  result: DispatchResult | undefined;
}

/**
 * Ejecuta una entrega ya validada: toma el claim, corre el manejador y
 * completa el claim, dentro de un span de consumidor que continúa la traza del
 * sobre.
 */
export class DeliveryExecution {
  constructor(
    private readonly claimGuard: ClaimGuard,
    private readonly classifier: DeliveryClassifier,
    private readonly tracing: Tracing,
    private readonly restorer: TraceContextRestorer,
    private readonly runInContext: MessageDispatcherOptions['runInContext'],
    private readonly consumer: string,
  ) {}

  async execute(
    envelope: MessageEnvelope,
    delivery: PreparedDelivery,
    fingerprint: string,
    options: DispatchOptions,
  ): Promise<DispatchResult> {
    const state: RunState = {
      stage: Stage.Claim,
      claim: undefined,
      result: undefined,
    };
    try {
      await context.with(this.restorer.contextFrom(envelope.traceparent), () =>
        this.traced(envelope, delivery, fingerprint, options, state),
      );
    } catch (err) {
      switch (state.stage) {
        case Stage.Handler:
          await this.releaseHeld(state);
          return this.classifier.failure(envelope.id, err, options, false);
        case Stage.Complete:
          // Los efectos pudieron deshacerse junto con la falla de complete.
          await this.releaseHeld(state);
          return this.classifier.failure(envelope.id, err, options, true);
        case Stage.Claim:
        case Stage.Done:
          return this.classifier.failure(envelope.id, err, options, true);
      }
    }
    return (
      state.result ?? { outcome: DispatchOutcome.Processed, id: envelope.id }
    );
  }

  private traced(
    envelope: MessageEnvelope,
    delivery: PreparedDelivery,
    fingerprint: string,
    options: DispatchOptions,
    state: RunState,
  ): Promise<void> {
    const run = () => this.run(envelope, delivery, fingerprint, options, state);
    return this.tracing.withSpan(
      `${envelope.type} process`,
      () =>
        this.runInContext ? this.runInContext(delivery.envelope, run) : run(),
      {
        kind: SpanKind.CONSUMER,
        attributes: {
          [MessagingSpanAttribute.OperationType]:
            MessagingOperationType.Process,
          [MessagingSpanAttribute.DestinationName]: this.consumer,
          [MessagingSpanAttribute.MessageId]: envelope.id,
          [MessagingSpanAttribute.EventType]: envelope.type,
        },
      },
    );
  }

  private async run(
    envelope: MessageEnvelope,
    delivery: PreparedDelivery,
    fingerprint: string,
    options: DispatchOptions,
    state: RunState,
  ): Promise<void> {
    const outcome = await this.claimGuard.claim(
      envelope,
      fingerprint,
      this.consumer,
      options,
    );
    if (outcome.kind === ClaimOutcomeKind.Settled) {
      state.result = outcome.result;
      state.stage = Stage.Done;
      return;
    }
    state.claim = outcome.claim;
    state.stage = Stage.Handler;
    await delivery.run();

    state.stage = Stage.Complete;
    await this.claimGuard.complete(outcome.claim);
    state.stage = Stage.Done;
  }

  private async releaseHeld(state: RunState): Promise<void> {
    if (state.claim === undefined) return;
    await this.claimGuard.release(state.claim);
    state.claim = undefined;
  }
}
