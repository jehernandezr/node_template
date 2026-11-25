import type { Clock } from '@platform/kernel';
import { TenantMoveErrorCode } from '../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../errors/tenant-move.error.js';

/** The working time of a move call, kept under the operation's deadline. */
export class TransferBudget {
  private readonly endsAt: number;

  constructor(
    private readonly clock: Clock,
    budgetMs: number,
  ) {
    this.endsAt = clock.now().getTime() + budgetMs;
  }

  /** @throws TenantMoveError `RoundPending` if the time ran out: the saga repeats the call. */
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
