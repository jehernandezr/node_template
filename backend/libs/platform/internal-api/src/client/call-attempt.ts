import type { ResilienceAttempt } from '@platform/resilience';
import type { TraceContextRestorer } from '@platform/observability';
import { CallOutcomeKind, type CallOutcome } from '@platform/primitives';
import type { OperationDescriptor } from '../contract/operation-descriptor.js';
import type { CallMeta } from '../transport/call-meta.js';
import type { Transport } from '../transport/transport.js';
import type { CallOptions } from './call-options.js';
import type { ClientOutcomeChecker } from './client-outcome-checker.js';
import { RetryableOutcomeError } from './retryable-outcome.error.js';

/**
 * One attempt of a call: builds the `CallMeta` and sends it through the transport.
 * It is created once per call and `ResilienceRegistry.execute` runs it once
 * per attempt.
 */
export class CallAttempt {
  private sent = false;

  constructor(
    private readonly transport: Transport,
    private readonly checker: ClientOutcomeChecker,
    private readonly restorer: TraceContextRestorer,
    private readonly descriptor: OperationDescriptor,
    private readonly input: unknown,
    private readonly options: CallOptions,
  ) {}

  /** Whether any attempt was sent: before that, stopping leaves no uncertain effects. */
  get started(): boolean {
    return this.sent;
  }

  /**
   * Marks `started` and sends the attempt. `CallMeta`: the key, `tenantId` and
   * `actorId` from `options`, `traceparent` from `options` or `restorer.current()`,
   * `deadline` and `timeoutMs` from the attempt deadline (`attempt.deadline.atMs` and
   * `attempt.deadline.remainingMs()`) and `signal`. The result goes through
   * `checker.settle`. If it is `transient-failure` or `uncertain`, it throws
   * `RetryableOutcomeError` so it is retried; otherwise, it returns it. A transport
   * error propagates: the resilience registry classifies it.
   */
  async run(
    signal: AbortSignal,
    attempt: ResilienceAttempt,
  ): Promise<CallOutcome<unknown>> {
    this.sent = true;
    // The attempt deadline is already the child of the call deadline that the resilience registry computed.
    const traceparent = this.options.traceparent ?? this.restorer.current();
    const meta: CallMeta = {
      idempotencyKey: this.options.idempotencyKey,
      timeoutMs: attempt.deadline.remainingMs(),
      deadline: attempt.deadline.atMs,
      signal,
      ...(traceparent !== undefined && { traceparent }),
      ...(this.options.tenantId !== undefined && {
        tenantId: this.options.tenantId,
      }),
      ...(this.options.actorId !== undefined && {
        actorId: this.options.actorId,
      }),
    };
    const outcome = this.checker.settle(
      this.descriptor,
      await this.transport.invoke(this.descriptor.id, this.input, meta),
    );
    if (
      outcome.kind === CallOutcomeKind.TransientFailure ||
      outcome.kind === CallOutcomeKind.Uncertain
    ) {
      throw new RetryableOutcomeError(outcome);
    }
    return outcome;
  }
}
