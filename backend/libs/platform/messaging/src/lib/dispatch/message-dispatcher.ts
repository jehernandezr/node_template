import type { z } from 'zod';
import {
  type MessageContract,
  MessageKind,
} from '../contracts/message-contract.js';
import { describeError } from '../errors/describe-error.js';
import {
  MessagingError,
  MessagingErrorCode,
} from '../errors/messaging-error.js';
import {
  type MessageEnvelope,
  messageEnvelopeSchema,
} from '../envelope/message-envelope.js';
import type { RetryPolicy } from '../topology/retry-policy.js';
import type { Topology } from '../topology/topology.js';
import {
  ErrorDisposition,
  type PermanenceCheck,
  classifyError,
  isPermanentByDefault,
} from './classify-error.js';
import type { ProcessedMessageStore } from './processed-message-store.js';

/** Result of handling one delivery. */
export enum DispatchOutcome {
  Processed = 'processed',
  Duplicate = 'duplicate',
  /** Unknown event type: acknowledged and dropped. */
  Ignored = 'ignored',
  RetryLater = 'retry-later',
  DeadLetter = 'dead-letter',
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
    }
  | {
      readonly outcome: DispatchOutcome.DeadLetter;
      readonly id?: string;
      readonly error: string;
    };

/** Handles one validated message. */
export type MessageHandler<T> = (
  data: T,
  envelope: MessageEnvelope<T>,
) => void | Promise<void>;

/** Per-delivery information supplied by the transport. */
export interface DispatchOptions {
  /** Deliveries so far, counting this one (1 on the first delivery). */
  readonly receiveCount: number;
  /** Retry policy of the queue. Without one, the first failure dead-letters. */
  readonly retryPolicy?: RetryPolicy;
}

/** Dependencies and rules of the dispatcher. */
export interface MessageDispatcherOptions {
  /** Consumer name, normally the queue name. Idempotency keys are `(consumer, id)`. */
  readonly consumer: string;
  readonly processed: ProcessedMessageStore;
  /** Resolves the kind of types without a handler: unknown events are ignored, commands dead-letter. */
  readonly topology?: Topology;
  /** Overrides the default permanence rule for errors thrown by handlers. */
  readonly isPermanent?: PermanenceCheck;
  /** Wraps the claim and the handler, e.g. to open a transaction or a tenant context. */
  readonly runInContext?: (
    envelope: MessageEnvelope,
    fn: () => Promise<void>,
  ) => Promise<void>;
}

interface Registration {
  readonly schema: z.ZodType<unknown>;
  readonly handler: (
    data: unknown,
    envelope: MessageEnvelope<unknown>,
  ) => void | Promise<void>;
}

interface RunState {
  claimed: boolean;
  duplicate: boolean;
  storeError: { readonly error: unknown } | undefined;
}

/**
 * Validates and dispatches raw deliveries to registered handlers.
 *
 * Flow: envelope and data validation (permanent on failure, handler not run), then
 * `claim(consumer, id)`, then the handler. A handler failure releases the claim and is
 * classified by `isPermanent`. Store errors are always retried and never thrown.
 */
export class MessageDispatcher {
  private readonly registrations = new Map<string, Registration>();
  private readonly options: MessageDispatcherOptions;
  private readonly isPermanent: PermanenceCheck;

  constructor(options: MessageDispatcherOptions) {
    this.options = options;
    this.isPermanent = options.isPermanent ?? isPermanentByDefault;
  }

  /** Registers the handler for a contract. One handler per message type. */
  register<T>(contract: MessageContract<T>, handler: MessageHandler<T>): this {
    if (this.registrations.has(contract.type)) {
      throw new MessagingError(
        MessagingErrorCode.DuplicateHandler,
        `a handler is already registered for type "${contract.type}"`,
      );
    }
    this.registrations.set(contract.type, {
      schema: contract.schema as z.ZodType<unknown>,
      handler: handler as Registration['handler'],
    });
    return this;
  }

  /** Handles one raw delivery and reports what the transport should do with it. */
  async dispatch(
    raw: unknown,
    options: DispatchOptions,
  ): Promise<DispatchResult> {
    const parsed = messageEnvelopeSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        outcome: DispatchOutcome.DeadLetter,
        error: `invalid envelope: ${parsed.error.message}`,
      };
    }
    // Zod marks `data` optional in the inferred type; the payload is validated per contract below.
    const envelope = parsed.data as MessageEnvelope;

    const registration = this.registrations.get(envelope.type);
    if (!registration) return this.unhandled(envelope);

    const data = registration.schema.safeParse(envelope.data);
    if (!data.success) {
      return {
        outcome: DispatchOutcome.DeadLetter,
        id: envelope.id,
        error: `invalid data: ${data.error.message}`,
      };
    }
    const validated: MessageEnvelope<unknown> = {
      ...envelope,
      data: data.data,
    };

    const state: RunState = {
      claimed: false,
      duplicate: false,
      storeError: undefined,
    };
    const run = async (): Promise<void> => {
      let isNew: boolean;
      try {
        isNew = await this.options.processed.claim(
          this.options.consumer,
          envelope.id,
        );
      } catch (err) {
        state.storeError = { error: err };
        throw err;
      }
      if (!isNew) {
        state.duplicate = true;
        return;
      }
      state.claimed = true;
      await registration.handler(data.data, validated);
    };

    try {
      if (this.options.runInContext) {
        await this.options.runInContext(validated, run);
      } else {
        await run();
      }
    } catch (err) {
      if (state.storeError) {
        return this.failure(envelope.id, state.storeError.error, options, true);
      }
      if (state.claimed) {
        await this.release(envelope.id);
      }
      return this.failure(envelope.id, err, options, false);
    }

    if (state.duplicate)
      return { outcome: DispatchOutcome.Duplicate, id: envelope.id };
    return { outcome: DispatchOutcome.Processed, id: envelope.id };
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
    };
  }

  /** Releases a claim. Best effort: if the release itself fails, the claim stays and a redelivery reports a duplicate. */
  private async release(id: string): Promise<void> {
    try {
      await this.options.processed.release(this.options.consumer, id);
    } catch {
      // The store is unavailable; the claim remains. Stores should expire stale claims.
    }
  }

  private failure(
    id: string,
    err: unknown,
    options: DispatchOptions,
    storeFailure: boolean,
  ): DispatchResult {
    const error = describeError(err);
    const policy = options.retryPolicy;
    const disposition = storeFailure
      ? ErrorDisposition.Retry
      : classifyError(err, this.isPermanent);
    if (
      disposition === ErrorDisposition.DeadLetter ||
      !policy ||
      options.receiveCount >= policy.maxAttempts
    ) {
      return { outcome: DispatchOutcome.DeadLetter, id, error };
    }
    return {
      outcome: DispatchOutcome.RetryLater,
      id,
      delayMs: policy.delayMs(options.receiveCount),
      error,
    };
  }
}
