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
 * Corre el handler de una llamada con la llave ya reclamada y guarda su
 * resultado final. Con `transactions`, el handler y `gate.complete` comparten
 * una unidad de trabajo: el resultado queda guardado si y solo si los efectos
 * se confirmaron. Sin `transactions`, un fallo entre el handler y `complete`
 * deja la llave reclamada hasta que venza el lease.
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
   * Corre el handler y devuelve el resultado que se le responde a quien llama.
   * Qué hace con la llave y la transacción según lo que ocurra:
   * - resultado final y `commit` distinto de `false`: se guarda dentro de la unidad de trabajo y se confirma;
   * - `commit: false` (o el handler lanzó) y el resultado es final: la unidad de
   *   trabajo se deshace con `UnitRollbackError` y el resultado se guarda aparte;
   * - resultado no final (transitorio, incierto, violación de protocolo): se deshace y se libera la llave;
   * - la unidad de trabajo no abrió o falló antes de guardar: se libera la llave;
   * - falló `complete` con `StaleClaimError`: `transient-failure` `stale-claim` con
   *   transacción, `uncertain` `stale-claim` sin ella;
   * - falló la confirmación: `uncertain` `commit-failed`.
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

  /** Corre el handler y guarda su resultado final con el token, dentro de la unidad de trabajo si la hay. */
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
    // Sin `TransactionManager` no hay nada que deshacer: el resultado sigue el camino normal.
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

  /** Cierra la llave según hasta dónde llegó la unidad de trabajo cuando algo falló. */
  private async recover(
    route: OperationRoute,
    claimed: ClaimedOperation,
    progress: UnitProgress,
    error: unknown,
  ): Promise<CallOutcome<unknown>> {
    if (error instanceof UnitRollbackError) {
      if (progress.thrown !== undefined) {
        // Un error lanzado se clasifica: un `DomainError` declarado es un resultado final.
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
        // La unidad de trabajo no llegó a abrirse o no corrió nada: se libera la llave.
        await this.gate.release(claimed);
        return this.outcomes.fromError(error);
      case UnitStage.Complete:
        if (error instanceof StaleClaimError) {
          // Otro intento tomó la llave. Sin unidad de trabajo los efectos ya están aplicados,
          // así que no se sabe si este resultado cuenta.
          return this.transactions !== undefined
            ? CallOutcome.transientFailure(InternalApiReason.StaleClaim, {
                cause: error,
              })
            : CallOutcome.uncertain(InternalApiReason.StaleClaim, error);
        }
        if (this.transactions !== undefined) {
          // Los efectos se deshicieron junto con el resultado: un reintento los aplica una sola vez.
          await this.gate.release(claimed);
        }
        return this.outcomes.fromError(error);
      case UnitStage.Commit:
        // La confirmación falló: los efectos y el resultado pueden o no estar guardados.
        return CallOutcome.uncertain(InternalApiReason.CommitFailed, error);
    }
  }

  /**
   * Guarda el resultado de un handler cuya unidad de trabajo ya se deshizo, por
   * su cuenta; así un reintento lo repite sin volver a correr el handler.
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
