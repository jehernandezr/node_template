/**
 * When a rejected invoice is charged again: after rejection number `n` it waits `delaysDays[n - 1]` days. Once
 * the schedule is exhausted there are no more automatic retries: delinquency runs its course and a late payment still settles it.
 * The retries fall within the delinquency grace period so that a transient card rejection does not suspend.
 */
export class CollectionRetrySchedule {
  static readonly STANDARD = new CollectionRetrySchedule([1, 3, 5]);
  private static readonly DAY_MS = 86_400_000;

  constructor(private readonly delaysDays: readonly number[]) {}

  /**
   * The next charge after rejection number `failedAttempts`, or `undefined` if no retries remain.
   * @param failedAttempts Rejections so far.
   * @param failedAt Instant of the last rejection.
   * @returns When to charge again, or `undefined` when the retries ran out.
   */
  nextAfter(failedAttempts: number, failedAt: Date): Date | undefined {
    const days = this.delaysDays[failedAttempts - 1];
    return days === undefined
      ? undefined
      : new Date(failedAt.getTime() + days * CollectionRetrySchedule.DAY_MS);
  }
}
