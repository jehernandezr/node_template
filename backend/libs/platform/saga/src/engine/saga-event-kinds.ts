import { SagaEventKind } from '../model/saga-event-kind.enum.js';
import { SagaStatus } from '../model/saga-status.enum.js';

/** Event that announces each state the saga reaches. */
export class SagaEventKinds {
  private static readonly BY_STATUS: ReadonlyMap<SagaStatus, SagaEventKind> =
    new Map([
      [SagaStatus.Completed, SagaEventKind.Completed],
      [SagaStatus.Compensated, SagaEventKind.Compensated],
      [SagaStatus.CompensationFailed, SagaEventKind.CompensationFailed],
      [SagaStatus.RequiresIntervention, SagaEventKind.RequiresIntervention],
      [SagaStatus.Suspended, SagaEventKind.Suspended],
    ]);

  static of(status: SagaStatus): SagaEventKind | undefined {
    return SagaEventKinds.BY_STATUS.get(status);
  }
}
