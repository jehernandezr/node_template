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

/** How far the execution got, to decide what an error means. */
enum Stage {
  /** While opening the context or taking the claim: infrastructure failure. */
  Claim = 'claim',
  Handler = 'handler',
  Complete = 'complete',
  Done = 'done',
}

interface RunState {
  stage: Stage;
  claim: AcquiredMessageClaim | undefined;
  /** Set when the claim decided the result without running the handler. */
  result: DispatchResult | undefined;
}

/**
 * Runs an already validated delivery: takes the claim, runs the handler and
 * completes the claim, inside a consumer span that continues the trace of the
 * envelope.
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

  /**
   * The effects may have been rolled back along with the complete failure.
   */
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
          return this.classifier.failure(envelope.id, err, options, false);
        case Stage.Complete:
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

  /**
   * The claim is released here, still inside the delivery context: in a sharded service, the store only knows which shard to go to while that context is open.
   */
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
    try {
      state.stage = Stage.Handler;
      await delivery.run();

      state.stage = Stage.Complete;
      await this.claimGuard.complete(outcome.claim);
    } catch (err) {
      await this.releaseHeld(state);
      throw err;
    }
    state.stage = Stage.Done;
  }

  private async releaseHeld(state: RunState): Promise<void> {
    if (state.claim === undefined) return;
    await this.claimGuard.release(state.claim);
    state.claim = undefined;
  }
}
