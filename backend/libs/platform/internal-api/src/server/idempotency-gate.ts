import {
  CallOutcome,
  type CallOutcomeFactory,
  type Deadline,
  type FinalOutcome,
} from '@platform/primitives';
import { ClaimState, type ClaimResult } from '@platform/kernel';
import { CompensationKey } from '../contract/compensation-key.js';
import { InternalApiReason } from '../contract/internal-api-reason.enum.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import type { ClaimedOperation } from './claimed-operation.js';
import { GateDecisionKind, type GateDecision } from './gate-decision.js';
import type { IdempotencyGateOptions } from './idempotency-gate.options.js';
import type { ProcessedOperationStore } from './processed-operation-store.js';

/** Claim, complete and release of the idempotency key of a call on top of the `ProcessedOperationStore`. */
export class IdempotencyGate {
  constructor(
    private readonly store: ProcessedOperationStore,
    private readonly outcomes: CallOutcomeFactory,
    private readonly options: IdempotencyGateOptions = {},
  ) {}

  /**
   * Requests the claim of `key` with the hash `fingerprint`, for the call's tenant if it has one; the lease lasts until
   * `deadline` plus the margin.
   * - The store throws: `Respond` with `outcomes.fromError(error)`.
   * - The key has the tombstone of its compensation: `Respond` with the tombstone result, without running the step.
   * - The stored hash differs: if the claim was acquired it is released quietly, and `Respond`
   * with `protocol-violation` `idempotency-key-reuse`.
   * - `Completed`: `Respond` with the stored result.
   * - `InProgress`: `Respond` with `transient-failure` `in-progress`.
   * - `Acquired`: `Proceed` with the key and its token.
   * A claim acquired with a different hash is used by nobody: it is released so the key is free.
   * @param key Idempotency key.
   * @param fingerprint Fingerprint of the input.
   * @param deadline Call deadline.
   * @param tenantId Tenant of the call.
   * @returns The decision.
   */
  async claim(
    key: string,
    fingerprint: string,
    deadline: Deadline,
    tenantId?: string,
  ): Promise<GateDecision> {
    let claim: ClaimResult<FinalOutcome<unknown>>;
    try {
      claim = await this.store.claim(key, {
        fingerprint,
        deadline,
        ...(tenantId !== undefined && { tenantId }),
        ...(this.options.leaseMarginMs !== undefined && {
          leaseMarginMs: this.options.leaseMarginMs,
        }),
        ...(this.options.minLeaseMs !== undefined && {
          minLeaseMs: this.options.minLeaseMs,
        }),
      });
    } catch (error) {
      return {
        kind: GateDecisionKind.Respond,
        outcome: this.outcomes.fromError(error),
      };
    }

    if (
      claim.state === ClaimState.Completed &&
      claim.fingerprint === CompensationKey.TOMBSTONE_FINGERPRINT
    ) {
      return { kind: GateDecisionKind.Respond, outcome: claim.result };
    }
    if (claim.fingerprint !== fingerprint) {
      if (claim.state === ClaimState.Acquired) {
        await this.release({ key, claimToken: claim.claimToken });
      }
      return {
        kind: GateDecisionKind.Respond,
        outcome: CallOutcome.protocolViolation(
          InternalApiReason.IdempotencyKeyReuse,
          InternalApiErrorCode.IdempotencyKeyReuse,
        ),
      };
    }

    switch (claim.state) {
      case ClaimState.Completed:
        return { kind: GateDecisionKind.Respond, outcome: claim.result };
      case ClaimState.InProgress:
        return {
          kind: GateDecisionKind.Respond,
          outcome: CallOutcome.transientFailure(InternalApiReason.InProgress),
        };
      case ClaimState.Acquired:
        return {
          kind: GateDecisionKind.Proceed,
          claimed: { key, claimToken: claim.claimToken },
        };
    }
  }

  /**
   * Stores the final result with the token. Propagates `StaleClaimError` if another
   * attempt took the key.
   * @param claimed Claimed operation.
   * @param outcome Final outcome.
   */
  complete(
    claimed: ClaimedOperation,
    outcome: FinalOutcome<unknown>,
  ): Promise<void> {
    return this.store.complete(claimed.key, claimed.claimToken, outcome);
  }

  /**
   * Releases the claim. A stale token means another attempt owns the
   * key: it never throws, because the result of this call is already decided.
   * The lease expires on its own: failing here does not change the response already decided.
   * @param claimed Claimed operation.
   */
  async release(claimed: ClaimedOperation): Promise<void> {
    try {
      await this.store.release(claimed.key, claimed.claimToken);
    } catch {}
  }
}
