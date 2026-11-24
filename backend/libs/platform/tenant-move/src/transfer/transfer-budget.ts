import type { Clock } from '@platform/kernel';
import { TenantMoveErrorCode } from '../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../errors/tenant-move.error.js';

/** El tiempo de trabajo de una llamada de traslado, que queda bajo el plazo de la operación. */
export class TransferBudget {
  private readonly endsAt: number;

  constructor(
    private readonly clock: Clock,
    budgetMs: number,
  ) {
    this.endsAt = clock.now().getTime() + budgetMs;
  }

  /** @throws TenantMoveError `RoundPending` si el tiempo se acabó: la saga repite la llamada. */
  check(table: string): void {
    if (this.clock.now().getTime() >= this.endsAt) {
      throw new TenantMoveError(
        TenantMoveErrorCode.RoundPending,
        'The round did not finish within the call budget',
        { table },
      );
    }
  }
}
