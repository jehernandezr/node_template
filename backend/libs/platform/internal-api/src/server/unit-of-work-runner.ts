import type { TransactionManager } from '@platform/kernel';
import {
  CallOutcome,
  isFinalOutcome,
  StaleClaimError,
  type CallOutcomeFactory,
} from '@platform/primitives';
import { InternalApiReason } from '../contract/internal-api-reason.enum.js';
import type { CallMeta } from '../transport/call-meta.js';
import type { ClaimedOperation } from './claimed-operation.js';
import { HandlerOutcomeChecker } from './handler-outcome-checker.js';
import type { HandlerResult } from './handler-result.js';
import type { IdempotencyGate } from './idempotency-gate.js';
import type { OperationRoute } from './operation-route.js';
import { UnitProgress } from './unit-progress.js';
import { UnitRollbackError } from './unit-rollback.error.js';
import { UnitStage } from './unit-stage.enum.js';

/**
 * Runs the handler of a call with the key already claimed and stores its
 * final result. With `transactions`, the handler and `gate.complete` share
 * a unit of work: the result is stored if and only if the effects
 * were committed. Without `transactions`, a failure between the handler and `complete`
 * leaves the key claimed until the lease expires.
 */
export class UnitOfWorkRunner {
  constructor(
    private readonly gate: IdempotencyGate,
    private readonly checker: HandlerOutcomeChecker,
    private readonly outcomes: CallOutcomeFactory,
    private readonly transactions?: Pick<
      TransactionManager,
      'runInTransaction'
    >,
  ) {}

  /**
   * Runs the handler and returns the result sent back to the caller.
   * What it does with the key and the transaction depending on what happens:
   * - final result and `commit` other than `false`: it is stored inside the unit of work and committed;
   * - `commit: false` (or the handler threw) and the result is final: the unit of
   *   work is rolled back with `UnitRollbackError` and the result is stored separately;
   * - non-final result (transient, uncertain, protocol violation): it is rolled back and the key is released;
   * - the unit of work did not open or failed before storing: the key is released;
   * - `complete` failed with `StaleClaimError`: `transient-failure` `stale-claim` with
   *   a transaction, `uncertain` `stale-claim` without one;
   * - the commit failed: `uncertain` `commit-failed`.
   */
  async run(
    route: OperationRoute,
    claimed: ClaimedOperation,
    input: unknown,
    meta: CallMeta,
  ): Promise<CallOutcome<unknown>> {
    const progress = new UnitProgress();
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

  /** Runs the handler and stores its final result with the token, inside the unit of work if there is one. */
  private async runAndStore(
    route: OperationRoute,
    claimed: ClaimedOperation,
    input: unknown,
    meta: CallMeta,
    progress: UnitProgress,
  ): Promise<CallOutcome<unknown>> {
    progress.stage = UnitStage.Handler;
    let result: unknown;
    try {
      result = await route.handler.handle(input, meta);
    } catch (error) {
      progress.thrown = { error };
      throw new UnitRollbackError();
    }
    const outcome = this.checker.check(
      route,
      HandlerOutcomeChecker.outcomeOf(result),
    );
    if (!isFinalOutcome(outcome)) {
      progress.rejected = outcome;
      throw new UnitRollbackError();
    }
    // Without `TransactionManager` there is nothing to roll back: the result follows the normal path.
    if (
      (result as HandlerResult<unknown>).commit === false &&
      this.transactions !== undefined
    ) {
      progress.rolledBack = outcome;
      throw new UnitRollbackError();
    }
    progress.stage = UnitStage.Complete;
    await this.gate.complete(claimed, outcome);
    progress.stage = UnitStage.Commit;
    return outcome;
  }

  /** Closes the key according to how far the unit of work got when something failed. */
  private async recover(
    route: OperationRoute,
    claimed: ClaimedOperation,
    progress: UnitProgress,
    error: unknown,
  ): Promise<CallOutcome<unknown>> {
    if (error instanceof UnitRollbackError) {
      if (progress.thrown !== undefined) {
        // A thrown error is classified: a declared `DomainError` is a final result.
        return this.storeAlone(
          route,
          claimed,
          this.outcomes.fromError(progress.thrown.error),
        );
      }
      if (progress.rolledBack !== undefined) {
        return this.storeAlone(route, claimed, progress.rolledBack);
      }
      await this.gate.release(claimed);
      return progress.rejected ?? this.outcomes.fromError(error);
    }
    switch (progress.stage) {
      case UnitStage.Begin:
      case UnitStage.Handler:
        // The unit of work never opened or nothing ran: the key is released.
        await this.gate.release(claimed);
        return this.outcomes.fromError(error);
      case UnitStage.Complete:
        if (error instanceof StaleClaimError) {
          // Another attempt took the key. Without a unit of work the effects are already applied,
          // so it is unknown whether this result counts.
          return this.transactions !== undefined
            ? CallOutcome.transientFailure(InternalApiReason.StaleClaim, {
                cause: error,
              })
            : CallOutcome.uncertain(InternalApiReason.StaleClaim, error);
        }
        if (this.transactions !== undefined) {
          // The effects were rolled back along with the result: a retry applies them only once.
          await this.gate.release(claimed);
        }
        return this.outcomes.fromError(error);
      case UnitStage.Commit:
        // The commit failed: the effects and the result may or may not be stored.
        return CallOutcome.uncertain(InternalApiReason.CommitFailed, error);
    }
  }

  /**
   * Stores, on its own, the result of a handler whose unit of work was already rolled back;
   * this way a retry repeats it without running the handler again.
   */
  private async storeAlone(
    route: OperationRoute,
    claimed: ClaimedOperation,
    thrown: CallOutcome<unknown>,
  ): Promise<CallOutcome<unknown>> {
    const outcome = this.checker.check(route, thrown);
    if (!isFinalOutcome(outcome)) {
      await this.gate.release(claimed);
      return outcome;
    }
    try {
      await this.gate.complete(claimed, outcome);
    } catch (error) {
      return error instanceof StaleClaimError
        ? CallOutcome.uncertain(InternalApiReason.StaleClaim, error)
        : this.outcomes.fromError(error);
    }
    return outcome;
  }
}
