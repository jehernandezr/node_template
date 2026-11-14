import {
  PlatformErrorCode,
  validateContract,
  type OperationDefinition,
} from '@contracts/platform';
import { SystemClock, type Clock } from '@platform/kernel';
import { currentTraceparent } from '@platform/observability';
import {
  abortableSleep,
  backoffDelay,
  BackoffStrategy,
  CallOutcome,
  CallOutcomeKind,
  Deadline,
  raceDeadline,
  RaceStop,
} from '@platform/primitives';
import {
  allowedErrorCodes,
  defaultCallBudgetMs,
  effectiveAttempts,
  effectiveRetry,
  effectiveTimeout,
  resolveOperation,
} from './contract.js';
import type {
  CallInputOf,
  OperationDescriptor,
  OperationOutputOf,
} from './contract.js';
import { InternalApiError } from './errors.js';
import {
  DEFAULT_MAX_PAYLOAD_BYTES,
  fitsPayload,
  isValidCallKey,
} from './limits.js';
import type { ContractRegistry } from './registry.js';
import { InternalApiReason, invalidInputOutcome } from './result.js';
import type { CallMeta, Transport } from './transport.js';

export interface InternalClientOptions {
  readonly transport: Transport;
  /**
   * Catalogue of the operations this client may call. When given, an
   * operation must be registered there; `callById` requires it.
   */
  readonly registry?: ContractRegistry;
  /** Source of time for deadlines. Defaults to the system clock. */
  readonly clock?: Clock;
  /** Waits between attempts and resolves early when `signal` aborts. Defaults to a timer. */
  readonly sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  /** Returns a value in [0, 1) for the backoff jitter. Defaults to `Math.random`. */
  readonly random?: () => number;
  /** Largest serialized input sent or output accepted, in bytes. Defaults to 256 KiB. */
  readonly maxPayloadBytes?: number;
}

/** Per-call values. `idempotencyKey` is required. */
export interface CallOptions {
  readonly idempotencyKey: string;
  /**
   * W3C `traceparent` sent to the server, which continues that trace.
   * Defaults to the active span (`currentTraceparent()`).
   */
  readonly traceparent?: string;
  readonly tenantId?: string;
  readonly actorId?: string;
  /**
   * Budget of the whole call, retries included. Each attempt gets the
   * operation timeout cut to what is left, and the remaining time travels to
   * the server as `CallMeta.deadline`. Defaults to every attempt plus the
   * longest backoffs (`defaultCallBudgetMs`).
   */
  readonly deadline?: Deadline;
  /**
   * Cancels the call. An attempt in flight resolves as `uncertain` and no
   * further attempt is made. The transport receives a signal that aborts too.
   */
  readonly signal?: AbortSignal;
}

/** Waits between attempts; an abort ends the wait early and the loop stops. */
async function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  try {
    await abortableSleep(ms, { signal });
  } catch (error) {
    if (signal?.aborted !== true) {
      throw error;
    }
  }
}

function isRetryable(outcome: CallOutcome<unknown>): boolean {
  return (
    outcome.kind === CallOutcomeKind.TransientFailure ||
    outcome.kind === CallOutcomeKind.Uncertain
  );
}

/**
 * Typed client for internal operations. Owns retries, backoff and the time
 * budget. It never throws for contract problems: every result is a
 * `CallOutcome`.
 * - Invalid input: business error `PLATFORM.VALIDATION.INVALID_INPUT` with
 *   `details.fieldErrors` (`InputViolationOutcome`), without calling the
 *   transport. The router answers the same input with the same outcome.
 * - Invalid or oversized output, or an undeclared business code: `protocol-violation`.
 * - Declared business error: `business-error`, never retried.
 * - Transport exceptions: classified with `classifyFailure`.
 * - Attempt timeout or cancellation: `uncertain`.
 * Idempotent operations retry `transient-failure` and `uncertain` within the
 * deadline; the server deduplicates by idempotency key.
 */
export class InternalClient {
  private readonly transport: Transport;
  private readonly registry: ContractRegistry | undefined;
  private readonly clock: Clock;
  private readonly sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
  private readonly random: () => number;
  private readonly maxPayloadBytes: number;

  constructor(options: InternalClientOptions) {
    this.transport = options.transport;
    this.registry = options.registry;
    this.clock = options.clock ?? new SystemClock();
    this.sleep = options.sleep ?? defaultSleep;
    this.random = options.random ?? Math.random;
    this.maxPayloadBytes = options.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES;
  }

  /** Catalogue of the operations this client may call, when it was given one. */
  get contracts(): ContractRegistry | undefined {
    return this.registry;
  }

  /** Calls an operation declared with `defineOperation`. */
  async call<S extends OperationDefinition>(
    operation: S,
    input: CallInputOf<S>,
    options: CallOptions,
  ): Promise<CallOutcome<OperationOutputOf<S>>> {
    let descriptor: OperationDescriptor;
    try {
      descriptor = this.descriptorFor(operation);
    } catch (error) {
      return CallOutcome.fromError(error);
    }
    return this.callDescriptor(descriptor, input, options) as Promise<
      CallOutcome<OperationOutputOf<S>>
    >;
  }

  /** Calls a registered operation by id. Used by generic callers such as the saga engine. */
  async callById(
    operationId: string,
    input: unknown,
    options: CallOptions,
  ): Promise<CallOutcome<unknown>> {
    const registered = this.registry?.get(operationId);
    if (registered === undefined) {
      return CallOutcome.protocolViolation(
        InternalApiReason.UnknownOperation,
        PlatformErrorCode.InternalApiUnknownOperation,
      );
    }
    return this.callDescriptor(registered.descriptor, input, options);
  }

  private descriptorFor(operation: OperationDefinition): OperationDescriptor {
    const descriptor = resolveOperation(operation);
    if (this.registry === undefined) {
      return descriptor;
    }
    const registered = this.registry.get(descriptor.id);
    if (registered === undefined) {
      throw new InternalApiError(
        PlatformErrorCode.InternalApiUnknownOperation,
        `Operation "${descriptor.id}" is not registered`,
      );
    }
    return registered.descriptor;
  }

  private async callDescriptor(
    descriptor: OperationDescriptor,
    input: unknown,
    options: CallOptions,
  ): Promise<CallOutcome<unknown>> {
    const { metadata } = descriptor;
    if (!isValidCallKey(options.idempotencyKey, options.tenantId)) {
      return CallOutcome.protocolViolation(
        InternalApiReason.InvalidIdempotencyKey,
        PlatformErrorCode.InternalApiInvalidIdempotencyKey,
      );
    }
    const validation = validateContract(descriptor.input, input);
    if (!validation.ok) {
      return invalidInputOutcome(descriptor.id, validation.errors);
    }
    if (!fitsPayload(input, this.maxPayloadBytes)) {
      return CallOutcome.protocolViolation(
        InternalApiReason.PayloadTooLarge,
        PlatformErrorCode.InternalApiPayloadTooLarge,
      );
    }

    const deadline =
      options.deadline ??
      Deadline.after(defaultCallBudgetMs(metadata), this.clock);
    const { signal } = options;
    const retry = effectiveRetry(metadata);
    const maxAttempts = effectiveAttempts(metadata);

    // Before the first attempt nothing was sent, so stopping is a transient failure.
    let outcome: CallOutcome<unknown> = CallOutcome.transientFailure(
      InternalApiReason.DeadlineExceeded,
    );
    for (let attempt = 1; ; attempt++) {
      if (signal?.aborted) {
        if (attempt === 1) {
          outcome = CallOutcome.transientFailure(InternalApiReason.Cancelled);
        }
        break;
      }
      if (deadline.isExpired()) {
        break;
      }
      outcome = this.settle(
        descriptor,
        await this.attempt(descriptor, input, options, deadline),
      );
      if (!isRetryable(outcome) || attempt >= maxAttempts || signal?.aborted) {
        break;
      }
      const delay = Math.max(
        backoffDelay(attempt, {
          strategy: BackoffStrategy.EqualJitter,
          baseMs: retry.baseMs,
          maxMs: retry.maxMs,
          random: this.random,
        }),
        outcome.kind === CallOutcomeKind.TransientFailure
          ? (outcome.retryAfterMs ?? 0)
          : 0,
      );
      if (delay >= deadline.remaining()) {
        break;
      }
      await this.sleep(delay, signal);
    }
    return outcome;
  }

  /** Checks a transport outcome against the contract. */
  private settle(
    descriptor: OperationDescriptor,
    outcome: CallOutcome<unknown>,
  ): CallOutcome<unknown> {
    switch (outcome.kind) {
      case CallOutcomeKind.Success: {
        if (!fitsPayload(outcome.value, this.maxPayloadBytes)) {
          return CallOutcome.protocolViolation(
            InternalApiReason.PayloadTooLarge,
            PlatformErrorCode.InternalApiPayloadTooLarge,
          );
        }
        const parsed = descriptor.output.safeParse(outcome.value);
        return parsed.success
          ? CallOutcome.success(parsed.data)
          : CallOutcome.protocolViolation(
              InternalApiReason.InvalidOutput,
              PlatformErrorCode.InternalApiInvalidOutput,
            );
      }
      case CallOutcomeKind.BusinessError:
        return allowedErrorCodes(descriptor.metadata).has(outcome.code)
          ? outcome
          : CallOutcome.protocolViolation(
              InternalApiReason.UndeclaredError,
              outcome.code,
            );
      case CallOutcomeKind.ProtocolViolation:
      case CallOutcomeKind.TransientFailure:
      case CallOutcomeKind.Uncertain:
        return outcome;
      default:
        return CallOutcome.protocolViolation(
          InternalApiReason.InvalidHandlerResult,
          PlatformErrorCode.InternalApiInvalidHandlerResult,
        );
    }
  }

  /**
   * One attempt, bounded by the operation timeout cut to the call deadline.
   * On timeout or cancellation the transport signal aborts and the attempt
   * resolves as `uncertain`: the server may have applied it.
   */
  private async attempt(
    descriptor: OperationDescriptor,
    input: unknown,
    options: CallOptions,
    deadline: Deadline,
  ): Promise<CallOutcome<unknown>> {
    const now = this.clock.now().getTime();
    const budget = Math.max(
      0,
      Math.min(effectiveTimeout(descriptor.metadata), deadline.atMs - now),
    );
    const attemptAt = now + budget;
    const traceparent = options.traceparent ?? currentTraceparent();
    const raced = await raceDeadline(
      (signal) =>
        this.invokeTransport(descriptor.id, input, {
          idempotencyKey: options.idempotencyKey,
          timeoutMs: budget,
          deadline: attemptAt,
          signal,
          ...(traceparent !== undefined && { traceparent }),
          ...(options.tenantId !== undefined && { tenantId: options.tenantId }),
          ...(options.actorId !== undefined && { actorId: options.actorId }),
        }),
      {
        deadline: Deadline.at(attemptAt, this.clock),
        ...(options.signal !== undefined && { signal: options.signal }),
      },
    );
    if (raced.settled) {
      return raced.value;
    }
    return CallOutcome.uncertain(
      raced.stop === RaceStop.Timeout
        ? InternalApiReason.Timeout
        : InternalApiReason.Cancelled,
    );
  }

  private async invokeTransport(
    operationId: string,
    input: unknown,
    meta: CallMeta,
  ): Promise<CallOutcome<unknown>> {
    try {
      return await this.transport.invoke(operationId, input, meta);
    } catch (error) {
      return CallOutcome.fromError(error);
    }
  }
}
