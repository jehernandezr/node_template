import {
  PostgresFailureClassifier,
  PostgresSqlState,
} from '@platform/persistence';
import { TenantMoveErrorCode } from '../../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../../errors/tenant-move.error.js';

/**
 * A copy round in which a foreign key that fails on the target means a child row written on the source after
 * the round copied its parent table: the next round brings the parent, so the round is pending, not failed.
 */
export class ForeignKeyRound {
  /**
   * Runs `work` and returns its result.
   * @throws TenantMoveError `RoundPending` when `work` fails with a foreign key violation; any other error as is.
   */
  static async run<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (
        PostgresFailureClassifier.hasSqlState(
          error,
          PostgresSqlState.ForeignKeyViolation,
        )
      ) {
        throw new TenantMoveError(
          TenantMoveErrorCode.RoundPending,
          'A row reached the target before its parent',
        );
      }
      throw error;
    }
  }
}
