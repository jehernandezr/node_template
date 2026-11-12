import { validateContract } from '@contracts/platform';
import { SystemClock, type Clock } from '@platform/kernel';
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
import {
  allowedErrorCodes,
  INVALID_INPUT_CODE,
  resolveOperation,
} from './contract.js';
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
import { InternalApiReason } from './result.js';
import type { ProcessedOperationStore } from './store.js';
import type { CallMeta } from './transport.js';

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

const KNOWN_KINDS: ReadonlySet<unknown> = new Set(
  Object.values(CallOutcomeKind),
);

/**
 * Server side of the internal API. Validates input, enforces idempotency by
 * tenant, operation and key with a fenced three-state claim, checks deadlines
 * and results against the contract, and dispatches to handlers.
 */
export class InternalRouter {
  private readonly processed: ProcessedOperationStore;
  private readonly clock: Clock;
  private readonly leaseMarginMs: number | undefined;
  private readonly minLeaseMs: number | undefined;
  private readonly maxPayloadBytes: number;
  private readonly routes = new Map<string, Route>();

  constructor(options: InternalRouterOptions) {
    this.processed = options.processed;
    this.clock = options.clock ?? new SystemClock();
    this.leaseMarginMs = options.leaseMarginMs;
    this.minLeaseMs = options.minLeaseMs ?? options.leaseMs;
    this.maxPayloadBytes = options.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES;
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
   */
  async handle(
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
      return CallOutcome.businessError(INVALID_INPUT_CODE, {
        message: `Invalid input for "${operationId}"`,
        details: { fieldErrors: validation.errors },
      });
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

  /** Runs the handler for a claimed key and settles the claim with its token. */
  private async execute(
    route: Route,
    claimed: Claimed,
    input: unknown,
    meta: CallMeta,
  ): Promise<CallOutcome<unknown>> {
    let outcome: CallOutcome<unknown>;
    try {
      outcome = this.check(route, await route.handler(input, meta));
    } catch (error) {
      outcome = this.check(route, CallOutcome.fromError(error));
    }

    if (!isFinalOutcome(outcome)) {
      await this.releaseQuietly(claimed);
      return outcome;
    }
    try {
      await this.processed.complete(claimed.key, claimed.claimToken, outcome);
    } catch (error) {
      if (error instanceof StaleClaimError) {
        // Another attempt took the key over: whether this result counts is unknown.
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
