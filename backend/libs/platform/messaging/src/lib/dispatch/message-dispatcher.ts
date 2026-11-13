import { context, ROOT_CONTEXT, SpanKind } from '@opentelemetry/api';
import { type Clock, isErrorCode, SystemClock } from '@platform/kernel';
import { contextFromTraceparent, withSpan } from '@platform/observability';
import {
  ClaimState,
  Deadline,
  type ClaimResult,
  stableDigest,
} from '@platform/primitives';
import type { z } from 'zod';
import {
  type MessageDefinition,
  type MessageOutput,
  MessageKind,
} from '../contracts/message-contract.js';
import { describeError } from '../errors/describe-error.js';
import {
  MessagingError,
  MessagingErrorCode,
} from '../errors/messaging-error.js';
import {
  type MessageEnvelope,
  parseEnvelope,
} from '../envelope/message-envelope.js';
import type { RetryPolicy } from '../topology/retry-policy.js';
import type { Topology } from '../topology/topology.js';
import {
  ErrorDisposition,
  type PermanenceCheck,
  classifyError,
  isPermanentFailure,
} from './classify-error.js';
import {
  type ProcessedMessage,
  type ProcessedMessageStore,
  processedMessageKey,
} from './processed-message-store.js';

/** Result of handling one delivery. */
export enum DispatchOutcome {
  Processed = 'processed',
  Duplicate = 'duplicate',
  /** Unknown event type: acknowledged and dropped. */
  Ignored = 'ignored',
  RetryLater = 'retry-later',
  DeadLetter = 'dead-letter',
  /**
   * Another delivery of the same message holds the claim and its lease is still
   * valid (the first handler may still be running). Never ack it: leave it for
   * redelivery, e.g. as an SQS batch item failure.
   */
  InProgress = 'in-progress',
}

/** Outcome of {@link MessageDispatcher.dispatch}. */
export type DispatchResult =
  | { readonly outcome: DispatchOutcome.Processed; readonly id: string }
  | { readonly outcome: DispatchOutcome.Duplicate; readonly id: string }
  | {
      readonly outcome: DispatchOutcome.Ignored;
      readonly id: string;
      readonly type: string;
    }
  | {
      readonly outcome: DispatchOutcome.RetryLater;
      readonly id: string;
      readonly delayMs: number;
      readonly error: string;
      /** Stable code of the error, when it has one. */
      readonly code?: string;
    }
  | {
      readonly outcome: DispatchOutcome.InProgress;
      readonly id: string;
      /** Time left on the current lease; a sensible redelivery delay. */
      readonly delayMs: number;
    }
  | {
      readonly outcome: DispatchOutcome.DeadLetter;
      readonly id?: string;
      readonly error: string;
      /** Stable code of the error, when it has one. */
      readonly code?: string;
    };

/**
 * Whether the transport must leave the delivery for redelivery instead of
 * acknowledging it (SQS: report it as a batch item failure).
 */
export function requiresRedelivery(result: DispatchResult): boolean {
  return (
    result.outcome === DispatchOutcome.RetryLater ||
    result.outcome === DispatchOutcome.InProgress
  );
}

/** Handles one validated message. */
export type MessageHandler<T> = (
  data: T,
  envelope: MessageEnvelope<T>,
) => void | Promise<void>;

/**
 * Decides whether the envelope tenant is legitimate for this consumer, e.g. that
 * the tenant exists and is subscribed. `tenantId` is undefined when the
 * envelope has none. Throwing is treated as a transient failure.
 */
export type TenantVerifier = (
  tenantId: string | undefined,
  envelope: MessageEnvelope,
) => boolean | Promise<boolean>;

/** Per-delivery information supplied by the transport. */
export interface DispatchOptions {
  /** Deliveries so far, counting this one (1 on the first delivery). */
  readonly receiveCount: number;
  /**
   * Retry policy of the queue. Defaults to the policy of the consumer queue in
   * the dispatcher topology. Without either, the first failure dead-letters.
   */
  readonly retryPolicy?: RetryPolicy;
  /**
   * Current visibility timeout of this delivery, in milliseconds. The claim
   * lease is never shorter than this.
   */
  readonly visibilityTimeoutMs?: number;
  /**
   * Tenant of the subscription the delivery came through. When set, the
   * envelope `tenantid` must be exactly this one. Overrides the dispatcher's
   * `expectedTenantId`.
   */
  readonly expectedTenantId?: string;
}

/** Dependencies and rules of the dispatcher. */
export interface MessageDispatcherOptions {
  /** Consumer name, normally the queue name. Idempotency keys are `(consumer, id)`. */
  readonly consumer: string;
  readonly processed: ProcessedMessageStore;
  /** Resolves the kind of types without a handler: unknown events are ignored, commands dead-letter. */
  readonly topology?: Topology;
  /**
   * Overrides the permanence rule for errors thrown by handlers. Defaults to
   * {@link isPermanentFailure} (the shared `classifyFailure`).
   */
  readonly isPermanent?: PermanenceCheck;
  /** Wraps the claim and the handler, e.g. to open a transaction or a tenant context. */
  readonly runInContext?: (
    envelope: MessageEnvelope,
    fn: () => Promise<void>,
  ) => Promise<void>;
  /** Source of time for leases. Defaults to the system clock. */
  readonly clock?: Clock;
  /**
   * Minimum claim lease in milliseconds. Must be at least the queue visibility
   * timeout. Defaults to the visibility timeout of the consumer queue in
   * `topology`, or {@link DEFAULT_CLAIM_LEASE_MS}.
   */
  readonly minLeaseMs?: number;
  /** Extra lease time over `minLeaseMs`. Defaults to the primitives default. */
  readonly leaseMarginMs?: number;
  /** Tenant this consumer serves (single-tenant queue). See {@link DispatchOptions.expectedTenantId}. */
  readonly expectedTenantId?: string;
  /** Verifies the envelope tenant before the handler runs. */
  readonly verifyTenant?: TenantVerifier;
  /**
   * Accepts any envelope `tenantid` without verification. Insecure: a producer
   * could act on another tenant's data.
   * @deprecated Configure `expectedTenantId` or `verifyTenant` instead.
   */
  readonly trustEnvelopeTenant?: boolean;
}

/** Lease used when neither the options nor the topology give a visibility timeout (SQS default). */
export const DEFAULT_CLAIM_LEASE_MS = 30_000;

interface Registration {
  readonly schema: z.ZodType<unknown>;
  readonly handler: (
    data: unknown,
    envelope: MessageEnvelope<unknown>,
  ) => void | Promise<void>;
}

/** Where the run stopped, to decide what a thrown error means. */
enum Stage {
  /** Opening the context or claiming: an infrastructure failure. */
  Claim = 'claim',
  Handler = 'handler',
  Complete = 'complete',
  Done = 'done',
}

interface RunState {
  stage: Stage;
  claimToken: string | undefined;
  /** Set when the claim decided the outcome without running the handler. */
  result: DispatchResult | undefined;
}

function codeOf(err: unknown): string | undefined {
  const code = (err as { code?: unknown } | null)?.code;
  return isErrorCode(code) ? code : undefined;
}

function assertLease(name: string, value: number | undefined): void {
  if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
    throw new MessagingError(
      MessagingErrorCode.InvalidOptions,
      `${name} must be a finite number > 0`,
    );
  }
}

/**
 * Validates and dispatches raw deliveries to registered handlers.
 *
 * Flow:
 * 1. Size limit and envelope validation, before any payload parsing (dead-letter on failure).
 * 2. Handler lookup, then tenant verification (dead-letter on mismatch).
 * 3. Contract validation of `data` (dead-letter on failure, handler not run).
 * 4. Three-state claim of `(consumer, id)` with a lease of at least the visibility timeout:
 *    `completed` is a duplicate, `in-progress` is left for redelivery, `acquired` runs the
 *    handler and then completes the claim with its token.
 * 5. A handler failure releases the claim and is classified by `isPermanent`. Store and
 *    context errors are always retried and never thrown.
 */
export class MessageDispatcher {
  private readonly registrations = new Map<string, Registration>();
  private readonly options: MessageDispatcherOptions;
  private readonly isPermanent: PermanenceCheck;
  private readonly clock: Clock;
  private readonly baseLeaseMs: number;
  private readonly queueRetryPolicy: RetryPolicy | undefined;

  constructor(options: MessageDispatcherOptions) {
    assertLease('minLeaseMs', options.minLeaseMs);
    if (options.leaseMarginMs !== undefined) {
      if (!Number.isFinite(options.leaseMarginMs) || options.leaseMarginMs < 0)
        throw new MessagingError(
          MessagingErrorCode.InvalidOptions,
          'leaseMarginMs must be a finite number >= 0',
        );
    }
    this.options = options;
    this.isPermanent = options.isPermanent ?? isPermanentFailure;
    this.clock = options.clock ?? new SystemClock();
    const queue = options.topology?.queues.find(
      (q) => q.name === options.consumer,
    );
    this.baseLeaseMs =
      options.minLeaseMs ??
      (queue ? queue.visibilityTimeoutSeconds * 1000 : DEFAULT_CLAIM_LEASE_MS);
    this.queueRetryPolicy = queue?.retryPolicy;
  }

  /**
   * Registers the handler for an event or command of the contracts kit
   * (`defineEvent`, `defineCommand`). One handler per message type.
   */
  register<M extends MessageDefinition>(
    contract: M,
    handler: MessageHandler<MessageOutput<M>>,
  ): this {
    if (this.registrations.has(contract.type)) {
      throw new MessagingError(
        MessagingErrorCode.DuplicateHandler,
        `a handler is already registered for type "${contract.type}"`,
      );
    }
    this.registrations.set(contract.type, {
      schema: contract.schema as z.ZodType,
      handler: handler as Registration['handler'],
    });
    return this;
  }

  /**
   * Handles one raw delivery (a JSON string or a decoded value) and reports what
   * the transport should do with it. The handler runs in a consumer span that
   * continues the envelope `traceparent`.
   */
  async dispatch(
    raw: unknown,
    options: DispatchOptions,
  ): Promise<DispatchResult> {
    const effective: DispatchOptions =
      options.retryPolicy === undefined && this.queueRetryPolicy !== undefined
        ? { ...options, retryPolicy: this.queueRetryPolicy }
        : options;
    return this.dispatchWith(raw, effective);
  }

  private async dispatchWith(
    raw: unknown,
    options: DispatchOptions,
  ): Promise<DispatchResult> {
    const parsed = parseEnvelope(raw);
    if (!parsed.ok) {
      return {
        outcome: DispatchOutcome.DeadLetter,
        error: parsed.error.message,
        code: parsed.error.code,
      };
    }
    const envelope = parsed.value;

    const registration = this.registrations.get(envelope.type);
    if (!registration) return this.unhandled(envelope);

    let tenantRejection: MessagingError | undefined;
    try {
      tenantRejection = await this.checkTenant(envelope, options);
    } catch (err) {
      return this.failure(envelope.id, err, options, true);
    }
    if (tenantRejection) {
      return {
        outcome: DispatchOutcome.DeadLetter,
        id: envelope.id,
        error: tenantRejection.message,
        code: tenantRejection.code,
      };
    }

    const data = registration.schema.safeParse(envelope.data);
    if (!data.success) {
      return {
        outcome: DispatchOutcome.DeadLetter,
        id: envelope.id,
        error: `invalid data: ${data.error.message}`,
        code: MessagingErrorCode.InvalidPayload,
      };
    }
    const validated: MessageEnvelope<unknown> = {
      ...envelope,
      data: data.data,
    };

    let fingerprint: string;
    try {
      fingerprint = stableDigest({
        type: envelope.type,
        tenantid: envelope.tenantid ?? null,
        data: envelope.data,
      });
    } catch {
      return {
        outcome: DispatchOutcome.DeadLetter,
        id: envelope.id,
        error: 'invalid envelope: data is not canonical JSON',
        code: MessagingErrorCode.InvalidEnvelope,
      };
    }

    const key = processedMessageKey(this.options.consumer, envelope.id);
    const leaseMs = Math.max(
      this.baseLeaseMs,
      options.visibilityTimeoutMs ?? 0,
    );
    const state: RunState = {
      stage: Stage.Claim,
      claimToken: undefined,
      result: undefined,
    };

    const run = async (): Promise<void> => {
      const claim = await this.options.processed.claim(key, {
        fingerprint,
        deadline: Deadline.after(leaseMs, this.clock),
        minLeaseMs: leaseMs,
        ...(this.options.leaseMarginMs === undefined
          ? {}
          : { leaseMarginMs: this.options.leaseMarginMs }),
      });
      if (claim.state === ClaimState.Acquired) {
        state.claimToken = claim.claimToken;
      }
      state.result = this.claimOutcome(envelope.id, claim, fingerprint);
      if (state.result) {
        if (state.claimToken !== undefined) {
          // Acquired with a conflicting fingerprint: give the claim back.
          await this.release(key, state.claimToken);
          state.claimToken = undefined;
        }
        state.stage = Stage.Done;
        return;
      }

      state.stage = Stage.Handler;
      await registration.handler(data.data, validated);

      state.stage = Stage.Complete;
      const result: ProcessedMessage = {
        processedAt: this.clock.now().getTime(),
      };
      await this.options.processed.complete(
        key,
        state.claimToken as string,
        result,
      );
      state.stage = Stage.Done;
    };

    const runInContext = this.options.runInContext;
    const processDelivery = (): Promise<void> =>
      withSpan(
        `${envelope.type} process`,
        () => (runInContext ? runInContext(validated, run) : run()),
        {
          kind: SpanKind.CONSUMER,
          attributes: {
            'messaging.operation.type': 'process',
            'messaging.destination.name': this.options.consumer,
            'messaging.message.id': envelope.id,
            'cloudevents.event_type': envelope.type,
          },
        },
      );
    try {
      await context.with(
        contextFromTraceparent(envelope.traceparent, ROOT_CONTEXT),
        processDelivery,
      );
    } catch (err) {
      switch (state.stage) {
        case Stage.Handler:
          await this.releaseHeld(key, state);
          return this.failure(envelope.id, err, options, false);
        case Stage.Complete:
          // The effects may have been rolled back with the failed completion.
          await this.releaseHeld(key, state);
          return this.failure(envelope.id, err, options, true);
        case Stage.Claim:
        case Stage.Done:
          return this.failure(envelope.id, err, options, true);
      }
    }

    return (
      state.result ?? { outcome: DispatchOutcome.Processed, id: envelope.id }
    );
  }

  /** Outcome decided by the claim alone, or undefined when the handler must run. */
  private claimOutcome(
    id: string,
    claim: ClaimResult<ProcessedMessage>,
    fingerprint: string,
  ): DispatchResult | undefined {
    if (claim.fingerprint !== fingerprint) {
      return {
        outcome: DispatchOutcome.DeadLetter,
        id,
        error: 'message id was already used with different content',
        code: MessagingErrorCode.IdempotencyConflict,
      };
    }
    switch (claim.state) {
      case ClaimState.Completed:
        return { outcome: DispatchOutcome.Duplicate, id };
      case ClaimState.InProgress:
        return {
          outcome: DispatchOutcome.InProgress,
          id,
          delayMs: Math.max(0, claim.leaseUntil - this.clock.now().getTime()),
        };
      case ClaimState.Acquired:
        return undefined;
    }
  }

  /**
   * Checks the envelope tenant against the expected tenant and the verifier.
   * Without either, an envelope that names a tenant is rejected unless
   * `trustEnvelopeTenant` is set. Returns the rejection, or undefined to accept.
   */
  private async checkTenant(
    envelope: MessageEnvelope,
    options: DispatchOptions,
  ): Promise<MessagingError | undefined> {
    const expected = options.expectedTenantId ?? this.options.expectedTenantId;
    const tenant = envelope.tenantid;
    const verify = this.options.verifyTenant;

    if (expected !== undefined && tenant !== expected) {
      return new MessagingError(
        MessagingErrorCode.TenantMismatch,
        'envelope tenant does not match the subscription tenant',
      );
    }
    if (verify) {
      return (await verify(tenant, envelope))
        ? undefined
        : new MessagingError(
            MessagingErrorCode.TenantMismatch,
            'envelope tenant was rejected by the tenant verifier',
          );
    }
    if (
      expected !== undefined ||
      tenant === undefined ||
      this.options.trustEnvelopeTenant === true
    ) {
      return undefined;
    }
    return new MessagingError(
      MessagingErrorCode.TenantMismatch,
      'envelope tenant cannot be verified: configure expectedTenantId or verifyTenant',
    );
  }

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

  private async releaseHeld(key: string, state: RunState): Promise<void> {
    if (state.claimToken === undefined) return;
    await this.release(key, state.claimToken);
    state.claimToken = undefined;
  }

  /**
   * Releases a claim with its token. Best effort: if the release fails (store
   * down, or the token is stale because the lease was taken over), the claim
   * stays `in-progress` until its lease ends and a later delivery takes it over.
   */
  private async release(key: string, claimToken: string): Promise<void> {
    try {
      await this.options.processed.release(key, claimToken);
    } catch {
      // The lease bounds how long the claim can block redeliveries.
    }
  }

  private failure(
    id: string,
    err: unknown,
    options: DispatchOptions,
    infrastructureFailure: boolean,
  ): DispatchResult {
    const error = describeError(err);
    const code = codeOf(err);
    const policy = options.retryPolicy;
    const disposition = infrastructureFailure
      ? ErrorDisposition.Retry
      : classifyError(err, this.isPermanent);
    if (
      disposition === ErrorDisposition.DeadLetter ||
      !policy ||
      options.receiveCount >= policy.maxAttempts
    ) {
      return {
        outcome: DispatchOutcome.DeadLetter,
        id,
        error,
        ...(code === undefined ? {} : { code }),
      };
    }
    return {
      outcome: DispatchOutcome.RetryLater,
      id,
      delayMs: policy.delayMs(options.receiveCount),
      error,
      ...(code === undefined ? {} : { code }),
    };
  }
}
