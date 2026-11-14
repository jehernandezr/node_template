import { validateContract } from '@contracts/platform';
import {
  context as otelContext,
  SpanKind,
  trace,
  type Context,
} from '@opentelemetry/api';
import { SystemClock, type Clock } from '@platform/kernel';
import {
  contextFromTraceparent,
  parseTraceparent,
  withSpan,
} from '@platform/observability';
import type { TransactionManager } from '@platform/persistence';
import {
  CallOutcome,
  CallOutcomeKind,
  ClaimState,
  Deadline,
  isFinalOutcome,
  stableDigest,
  StaleClaimError,
  type ClaimResult,
  type FinalOutcome,
} from '@platform/primitives';
import { allowedErrorCodes, resolveOperation } from './contract.js';
import type {
  HandlerInputOf,
  OperationDescriptor,
  OperationOutputOf,
  OperationSource,
} from './contract.js';
import { InternalApiError, InternalApiErrorCode } from './errors.js';
import {
  DEFAULT_MAX_PAYLOAD_BYTES,
  fitsIdempotencyStore,
  fitsPayload,
  isValidCallKey,
  operationIdempotencyKey,
} from './limits.js';
import type { ContractRegistry } from './registry.js';
import { InternalApiReason, invalidInputOutcome } from './result.js';
import type { ProcessedOperationStore } from './store.js';
import type { CallMeta } from './transport.js';

/** Attributes of the server span of each call. */
export enum InternalApiSpanAttribute {
  /** RPC system (OpenTelemetry semantic conventions). */
  RpcSystem = 'rpc.system',
  /** Operation id. */
  RpcMethod = 'rpc.method',
  /** `CallOutcomeKind` of the call. */
  Outcome = 'platform.call.outcome',
}

/** Value of `rpc.system` for internal API calls. */
export const INTERNAL_API_RPC_SYSTEM = 'platform.internal-api';

export interface InternalRouterOptions {
  /** Three-state idempotency store with claim tokens. */
  readonly processed: ProcessedOperationStore;
  /** Source of time for deadlines. Defaults to the system clock. */
  readonly clock?: Clock;
  /**
   * Extra time the claim outlives the request deadline, so a slow handler
   * keeps the key until it finishes. Defaults to the store default (5 s).
   */
  readonly leaseMarginMs?: number;
  /** Shortest lease, counted from the claim. Defaults to none. */
  readonly minLeaseMs?: number;
  /**
   * @deprecated The lease now derives from the request deadline plus
   * `leaseMarginMs`. A value here is used as `minLeaseMs`.
   */
  readonly leaseMs?: number;
  /** Largest serialized input accepted or output stored, in bytes. Defaults to 256 KiB. */
  readonly maxPayloadBytes?: number;
  /**
   * Unit of work of the service, usually its `Database` from
   * `@platform/persistence`. When given, the handler and the stored result
   * (`processed.complete`) run in one transaction: the result is stored if and
   * only if the effects are committed. The claim runs before, on its own. The
   * store must then write through the open unit of work, as
   * `PostgresIdempotencyStore` does, on the same database as the handler.
   * Without it, a crash between the handler and `complete` leaves the key
   * claimed until the lease expires, and the retry runs the handler again.
   */
  readonly transactions?: Pick<TransactionManager, 'runInTransaction'>;
}

/**
 * Handler of an operation. It returns a `CallOutcome` or throws: a thrown
 * error is classified with `classifyFailure` (a `DomainError` is a business
 * error, a database outage is transient, an unknown error is a protocol
 * violation).
 */
export type OperationHandler<S extends OperationSource> = (
  input: HandlerInputOf<S>,
  ctx: CallMeta,
) => Promise<CallOutcome<OperationOutputOf<S>>>;

type StoredHandler = (
  input: unknown,
  ctx: CallMeta,
) => Promise<CallOutcome<unknown>>;

interface Route {
  readonly descriptor: OperationDescriptor;
  readonly handler: StoredHandler;
  readonly allowedCodes: ReadonlySet<string>;
}

interface Claimed {
  readonly key: string;
  readonly claimToken: string;
}

/** How far `execute` got, to settle the claim when something fails. */
enum Stage {
  /** Opening the unit of work; nothing ran. */
  Begin = 'begin',
  Handler = 'handler',
  /** Storing the result inside the unit of work. */
  Complete = 'complete',
  /** The result is stored; the unit of work is committing. */
  Commit = 'commit',
}

interface Progress {
  stage: Stage;
  /** Outcome that must not be stored; the unit of work rolls back. */
  rejected?: CallOutcome<unknown>;
  /** The handler threw; the unit of work rolls back. */
  handlerThrew?: boolean;
  thrown?: unknown;
}

/** Thrown inside the unit of work to roll it back; never escapes `execute`. */
const ROLLBACK: unique symbol = Symbol('internal-api.rollback');

const KNOWN_KINDS: ReadonlySet<unknown> = new Set(
  Object.values(CallOutcomeKind),
);

/**
 * Server side of the internal API. Validates input, enforces idempotency by
 * tenant, operation and key with a fenced three-state claim, checks deadlines
 * and results against the contract, and dispatches to handlers. With
 * `transactions`, the handler and the stored result share one unit of work.
 *
 * Calls come from other services of the platform, so the router continues the
 * trace of `CallMeta.traceparent`: each call runs in a server span child of it.
 */
export class InternalRouter {
  private readonly processed: ProcessedOperationStore;
  private readonly clock: Clock;
  private readonly leaseMarginMs: number | undefined;
  private readonly minLeaseMs: number | undefined;
  private readonly maxPayloadBytes: number;
  private readonly transactions:
    Pick<TransactionManager, 'runInTransaction'> | undefined;
  private readonly routes = new Map<string, Route>();

  constructor(options: InternalRouterOptions) {
    this.processed = options.processed;
    this.clock = options.clock ?? new SystemClock();
    this.leaseMarginMs = options.leaseMarginMs;
    this.minLeaseMs = options.minLeaseMs ?? options.leaseMs;
    this.maxPayloadBytes = options.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES;
    this.transactions = options.transactions;
  }

  /**
   * Binds a handler to an operation (a `defineOperation` descriptor or an
   * `@Operation` class). Throws `InvalidOperation` for anything else and
   * `DuplicateOperation` if the operation is already bound.
   */
  register<S extends OperationSource>(
    operation: S,
    handler: OperationHandler<S>,
  ): void {
    const descriptor = resolveOperation(operation);
    if (this.routes.has(descriptor.id)) {
      throw new InternalApiError(
        InternalApiErrorCode.DuplicateOperation,
        `A handler for "${descriptor.id}" is already registered`,
      );
    }
    this.routes.set(descriptor.id, {
      descriptor,
      handler: handler as unknown as StoredHandler,
      allowedCodes: allowedErrorCodes(descriptor.metadata),
    });
  }

  /** Throws `MissingHandler` listing every operation of the registry without a handler. */
  assertComplete(registry: ContractRegistry): void {
    const missing = registry
      .operations()
      .map((operation) => operation.id)
      .filter((id) => !this.routes.has(id));
    if (missing.length > 0) {
      throw new InternalApiError(
        InternalApiErrorCode.MissingHandler,
        `Missing handlers for: ${missing.join(', ')}`,
      );
    }
  }

  /**
   * Handles one call.
   * - Unknown operation, oversized payload, bad key, undeclared business code,
   *   invalid output or key reuse with another input: `protocol-violation`.
   * - Invalid input: business error `PLATFORM.VALIDATION.INVALID_INPUT` with
   *   `details.fieldErrors` (not stored).
   * - Expired deadline: `transient-failure`, without running the handler.
   * - Concurrent call on a claimed key: `transient-failure` `in-progress`.
   * - Handler exceptions: classified with `classifyFailure`.
   * - Success and declared business errors are stored and replayed; the rest
   *   release the claim. The lease lasts until the request deadline plus a margin.
   * The call runs in a server span that continues `meta.traceparent`.
   */
  handle(
    operationId: string,
    rawInput: unknown,
    meta: CallMeta,
  ): Promise<CallOutcome<unknown>> {
    return otelContext.with(traceContext(meta.traceparent), () =>
      withSpan(
        operationId,
        async (span) => {
          const outcome = await this.dispatch(operationId, rawInput, meta);
          span.setAttribute(InternalApiSpanAttribute.Outcome, outcome.kind);
          return outcome;
        },
        {
          kind: SpanKind.SERVER,
          attributes: {
            [InternalApiSpanAttribute.RpcSystem]: INTERNAL_API_RPC_SYSTEM,
            [InternalApiSpanAttribute.RpcMethod]: operationId,
          },
        },
      ),
    );
  }

  private async dispatch(
    operationId: string,
    rawInput: unknown,
    meta: CallMeta,
  ): Promise<CallOutcome<unknown>> {
    const route = this.routes.get(operationId);
    if (!route) {
      return CallOutcome.protocolViolation(
        InternalApiReason.UnknownOperation,
        InternalApiErrorCode.UnknownOperation,
      );
    }
    if (!fitsPayload(rawInput, this.maxPayloadBytes)) {
      return CallOutcome.protocolViolation(
        InternalApiReason.PayloadTooLarge,
        InternalApiErrorCode.PayloadTooLarge,
      );
    }
    if (!isValidCallKey(meta.idempotencyKey, meta.tenantId)) {
      return CallOutcome.protocolViolation(
        InternalApiReason.InvalidIdempotencyKey,
        InternalApiErrorCode.InvalidIdempotencyKey,
      );
    }

    const validation = validateContract(route.descriptor.input, rawInput);
    if (!validation.ok) {
      return invalidInputOutcome(operationId, validation.errors);
    }

    let deadline: Deadline;
    let fingerprint: string;
    try {
      deadline = Deadline.at(meta.deadline, this.clock);
      fingerprint = stableDigest(validation.value);
    } catch (error) {
      return CallOutcome.fromError(error);
    }
    if (deadline.isExpired()) {
      return CallOutcome.transientFailure(InternalApiReason.DeadlineExceeded);
    }

    const key = operationIdempotencyKey({
      tenantId: meta.tenantId,
      operationId,
      idempotencyKey: meta.idempotencyKey,
    });
    if (!fitsIdempotencyStore(key)) {
      return CallOutcome.protocolViolation(
        InternalApiReason.InvalidIdempotencyKey,
        InternalApiErrorCode.InvalidIdempotencyKey,
      );
    }

    let claim: ClaimResult<FinalOutcome<unknown>>;
    try {
      claim = await this.processed.claim(key, {
        fingerprint,
        deadline,
        ...(this.leaseMarginMs !== undefined && {
          leaseMarginMs: this.leaseMarginMs,
        }),
        ...(this.minLeaseMs !== undefined && { minLeaseMs: this.minLeaseMs }),
      });
    } catch (error) {
      return CallOutcome.fromError(error);
    }

    if (claim.fingerprint !== fingerprint) {
      if (claim.state === ClaimState.Acquired) {
        await this.releaseQuietly({ key, claimToken: claim.claimToken });
      }
      return CallOutcome.protocolViolation(
        InternalApiReason.IdempotencyKeyReuse,
        InternalApiErrorCode.IdempotencyKeyReuse,
      );
    }
    switch (claim.state) {
      case ClaimState.Completed:
        return claim.result;
      case ClaimState.InProgress:
        return CallOutcome.transientFailure(InternalApiReason.InProgress);
      case ClaimState.Acquired:
        return this.execute(
          route,
          { key, claimToken: claim.claimToken },
          validation.value,
          meta,
        );
    }
  }

  /**
   * Runs the handler for a claimed key and stores its final outcome with the
   * claim token, both inside the unit of work when there is one. An outcome
   * that is not stored (a thrown handler, a transient failure, a broken
   * contract) rolls the unit of work back.
   */
  private async execute(
    route: Route,
    claimed: Claimed,
    input: unknown,
    meta: CallMeta,
  ): Promise<CallOutcome<unknown>> {
    const progress: Progress = { stage: Stage.Begin };
    const work = (): Promise<CallOutcome<unknown>> =>
      this.runAndStore(route, claimed, input, meta, progress);
    try {
      return this.transactions === undefined
        ? await work()
        : await this.transactions.runInTransaction(work);
    } catch (error) {
      return this.recover(route, claimed, progress, error);
    }
  }

  private async runAndStore(
    route: Route,
    claimed: Claimed,
    input: unknown,
    meta: CallMeta,
    progress: Progress,
  ): Promise<CallOutcome<unknown>> {
    progress.stage = Stage.Handler;
    let returned: CallOutcome<unknown>;
    try {
      returned = await route.handler(input, meta);
    } catch (error) {
      progress.handlerThrew = true;
      progress.thrown = error;
      throw ROLLBACK;
    }
    const outcome = this.check(route, returned);
    if (!isFinalOutcome(outcome)) {
      progress.rejected = outcome;
      throw ROLLBACK;
    }
    progress.stage = Stage.Complete;
    await this.processed.complete(claimed.key, claimed.claimToken, outcome);
    progress.stage = Stage.Commit;
    return outcome;
  }

  /** Settles the claim after `runAndStore` threw or the unit of work failed. */
  private async recover(
    route: Route,
    claimed: Claimed,
    progress: Progress,
    error: unknown,
  ): Promise<CallOutcome<unknown>> {
    const transactional = this.transactions !== undefined;
    if (error === ROLLBACK) {
      if (progress.handlerThrew === true) {
        // A thrown error is classified: a DomainError is a final business error.
        return this.storeAlone(
          route,
          claimed,
          CallOutcome.fromError(progress.thrown),
        );
      }
      await this.releaseQuietly(claimed);
      return progress.rejected ?? CallOutcome.fromError(error);
    }
    switch (progress.stage) {
      case Stage.Begin:
      case Stage.Handler:
        // The unit of work did not open: nothing ran.
        await this.releaseQuietly(claimed);
        return CallOutcome.fromError(error);
      case Stage.Complete:
        if (error instanceof StaleClaimError) {
          // Another attempt took the key over. Without a unit of work the
          // effects are already applied, so whether this result counts is unknown.
          return transactional
            ? CallOutcome.transientFailure(InternalApiReason.StaleClaim, {
                cause: error,
              })
            : CallOutcome.uncertain(InternalApiReason.StaleClaim, error);
        }
        if (transactional) {
          // The effects rolled back with the result: a retry applies them once.
          await this.releaseQuietly(claimed);
        }
        return CallOutcome.fromError(error);
      case Stage.Commit:
        // The commit failed: the effects and the result may or may not be stored.
        return CallOutcome.uncertain(InternalApiReason.CommitFailed, error);
    }
  }

  /**
   * Stores the outcome of a handler that threw. Its unit of work rolled back,
   * so the result is stored on its own; a retry replays it.
   */
  private async storeAlone(
    route: Route,
    claimed: Claimed,
    thrown: CallOutcome<unknown>,
  ): Promise<CallOutcome<unknown>> {
    const outcome = this.check(route, thrown);
    if (!isFinalOutcome(outcome)) {
      await this.releaseQuietly(claimed);
      return outcome;
    }
    try {
      await this.processed.complete(claimed.key, claimed.claimToken, outcome);
    } catch (error) {
      if (error instanceof StaleClaimError) {
        return CallOutcome.uncertain(InternalApiReason.StaleClaim, error);
      }
      return CallOutcome.fromError(error);
    }
    return outcome;
  }

  /** Checks a handler outcome against the contract. */
  private check(
    route: Route,
    outcome: CallOutcome<unknown>,
  ): CallOutcome<unknown> {
    if (
      typeof outcome !== 'object' ||
      outcome === null ||
      !KNOWN_KINDS.has(outcome.kind)
    ) {
      return CallOutcome.protocolViolation(
        InternalApiReason.InvalidHandlerResult,
        InternalApiErrorCode.InvalidHandlerResult,
      );
    }
    if (outcome.kind === CallOutcomeKind.Success) {
      const parsed = route.descriptor.output.safeParse(outcome.value);
      if (!parsed.success) {
        return CallOutcome.protocolViolation(
          InternalApiReason.InvalidOutput,
          InternalApiErrorCode.InvalidOutput,
        );
      }
      if (!fitsPayload(parsed.data, this.maxPayloadBytes)) {
        return CallOutcome.protocolViolation(
          InternalApiReason.PayloadTooLarge,
          InternalApiErrorCode.PayloadTooLarge,
        );
      }
      return CallOutcome.success(parsed.data);
    }
    if (
      outcome.kind === CallOutcomeKind.BusinessError &&
      !route.allowedCodes.has(outcome.code)
    ) {
      return CallOutcome.protocolViolation(
        InternalApiReason.UndeclaredError,
        outcome.code,
      );
    }
    return outcome;
  }

  /** Releases a claim. A stale token means another attempt owns the key, which is fine. */
  private async releaseQuietly(claimed: Claimed): Promise<void> {
    try {
      await this.processed.release(claimed.key, claimed.claimToken);
    } catch {
      // The outcome of this call is already decided; the lease expires anyway.
    }
  }
}

/**
 * Context in which a call runs. It continues the caller's trace: the router
 * only serves other services of the platform, so their `traceparent` is
 * trusted. When the transport already continued that trace (a server span of
 * the same trace is active), the active context is kept.
 */
function traceContext(traceparent: string | undefined): Context {
  const active = otelContext.active();
  const incoming = parseTraceparent(traceparent);
  if (incoming === null) {
    return active;
  }
  if (trace.getSpanContext(active)?.traceId === incoming.traceId) {
    return active;
  }
  return contextFromTraceparent(traceparent, active);
}
