import { SagaSettings } from '@platform/saga';
import { TenantMoveErrorCode } from '../../errors/tenant-move-error-code.enum.js';

/** Repeats a move step the way the move saga does while it reports a pending round. */
export class PendingRounds {
  /**
   * Calls the step again while it fails with `RoundPending`, up to the saga's limit of suspended attempts, so a step
   * that never converges fails the test instead of hanging it.
   * @param step Move step to call.
   * @returns What the step returns once its round ends.
   * @throws The step error when it is not `RoundPending` or the limit is reached.
   */
  static async untilDone<T>(step: () => Promise<T>): Promise<T> {
    for (let round = 1; ; round++) {
      try {
        return await step();
      } catch (error) {
        if (
          (error as { code?: unknown }).code !==
            TenantMoveErrorCode.RoundPending ||
          round >= SagaSettings.DEFAULT_MAX_SUSPEND_ATTEMPTS
        ) {
          throw error;
        }
      }
    }
  }
}
