import type { Clock } from '@platform/kernel';
import { validateContract } from '@contracts/platform';
import {
  CallOutcome,
  CanonicalJson,
  Deadline,
  DeadlineExceededError,
  TimerScheduler,
  type CallOutcomeFactory,
} from '@platform/primitives';
import { IdempotencyKeyPolicy } from '../contract/idempotency-key-policy.js';
import { InputViolation } from '../contract/input-violation.js';
import { InternalApiReason } from '../contract/internal-api-reason.enum.js';
import type { PayloadLimit } from '../contract/payload-limit.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import type { CallMeta } from '../transport/call-meta.js';
import type { ClaimKeeper } from './claim-keeper.js';
import type { CompensationTombstones } from './compensation-tombstones.js';
import { GateDecisionKind } from './gate-decision.js';
import type { IdempotencyGate } from './idempotency-gate.js';
import type { OperationRoute } from './operation-route.js';
import type { UnitOfWorkRunner } from './unit-of-work-runner.js';

/** Validates an incoming call against the contract and takes it to its handler with the idempotency key claimed. */
export class OperationDispatcher {
  constructor(
    private readonly payload: PayloadLimit,
    private readonly gate: IdempotencyGate,
    private readonly runner: UnitOfWorkRunner,
    private readonly clock: Clock,
    private readonly outcomes: CallOutcomeFactory,
    private readonly keeper: ClaimKeeper,
    private readonly tombstones: CompensationTombstones,
  ) {}

  /**
   * In this order:
   * 1. `rawInput` exceeds the cap: `protocol-violation` `payload-too-large`.
   * 2. Invalid key or tenant (`IdempotencyKeyPolicy.isValid`): `protocol-violation` `invalid-idempotency-key`.
   * 3. Input that breaks the contract: `InputViolation.outcome` (not stored).
   * 4. Deadline (`Deadline.at(meta.deadline, clock)`) and hash (`CanonicalJson.digest` of the parsed
   *    input); if they throw, `outcomes.fromError`. Expired deadline: `transient-failure` `deadline-exceeded`.
   * 5. Store key (`IdempotencyKeyPolicy.storeKey`) that does not fit: `protocol-violation` `invalid-idempotency-key`.
   * 6. With `forwards`, the call is the compensation of those operations: `tombstones.lay` lays the tombstone of the step it
   *    undoes and, if that step is still in progress, that is the response.
   * 7. `gate.claim`: if it responds, that is the response; otherwise, `runner.run` with the parsed input, while
   *    `keeper` renews the key lease. The handler receives in `meta.signal` a signal that aborts when the attempt
   *    deadline expires or when the caller cancels.
   */
  async dispatch(
    route: OperationRoute,
    rawInput: unknown,
    meta: CallMeta,
    forwards: readonly string[] = [],
  ): Promise<CallOutcome<unknown>> {
    if (!this.payload.fits(rawInput)) {
      return CallOutcome.protocolViolation(
        InternalApiReason.PayloadTooLarge,
        InternalApiErrorCode.PayloadTooLarge,
      );
    }
    if (!IdempotencyKeyPolicy.isValid(meta.idempotencyKey, meta.tenantId)) {
      return CallOutcome.protocolViolation(
        InternalApiReason.InvalidIdempotencyKey,
        InternalApiErrorCode.InvalidIdempotencyKey,
      );
    }

    const validation = validateContract(route.descriptor.input, rawInput);
    if (!validation.ok) {
      return InputViolation.outcome(route.descriptor.id, validation.errors);
    }

    let deadline: Deadline;
    let fingerprint: string;
    try {
      deadline = Deadline.at(meta.deadline, this.clock);
      fingerprint = CanonicalJson.digest(validation.value);
    } catch (error) {
      return this.outcomes.fromError(error);
    }
    if (deadline.isExpired()) {
      return CallOutcome.transientFailure(InternalApiReason.DeadlineExceeded);
    }

    const key = IdempotencyKeyPolicy.storeKey({
      tenantId: meta.tenantId,
      operationId: route.descriptor.id,
      idempotencyKey: meta.idempotencyKey,
    });
    if (!IdempotencyKeyPolicy.fitsStore(key)) {
      return CallOutcome.protocolViolation(
        InternalApiReason.InvalidIdempotencyKey,
        InternalApiErrorCode.InvalidIdempotencyKey,
      );
    }

    if (forwards.length > 0) {
      let waiting: CallOutcome<never> | undefined;
      try {
        waiting = await this.tombstones.lay(forwards, meta, deadline);
      } catch (error) {
        return this.outcomes.fromError(error);
      }
      if (waiting !== undefined) {
        return waiting;
      }
    }

    const decision = await this.gate.claim(
      key,
      fingerprint,
      deadline,
      meta.tenantId,
    );
    if (decision.kind === GateDecisionKind.Respond) {
      return decision.outcome;
    }
    const claimed = decision.claimed;
    const expiry = new AbortController();
    const cancel = TimerScheduler.armDetached(deadline.remainingMs(), () =>
      expiry.abort(new DeadlineExceededError(deadline.atMs)),
    );
    const signal =
      meta.signal === undefined
        ? expiry.signal
        : AbortSignal.any([expiry.signal, meta.signal]);
    try {
      return await this.keeper.during(claimed, () =>
        this.runner.run(route, claimed, validation.value, { ...meta, signal }),
      );
    } finally {
      cancel();
    }
  }
}
