/**
 * When a delivery's next attempt is due. `NotifyUser` sends as soon as it commits, so the first
 * retry waits a margin so as not to compete with that send; after that, each failure doubles the wait.
 * Pure utility.
 */
export class DeliveryRetrySchedule {
  static readonly FIRST_RETRY_MS = 2 * 60_000;

  /**
   * When a delivery that could not go out at once is first retried.
   * @param now Current instant.
   * @returns The first retry instant.
   */
  static firstRetryAt(now: Date): Date {
    return new Date(now.getTime() + DeliveryRetrySchedule.FIRST_RETRY_MS);
  }

  /**
   * When a delivery is retried after a failed attempt, backing off with each one.
   * @param attempts Attempts made so far.
   * @param now Instant of the last failure.
   * @returns The next retry instant.
   */
  static afterFailure(attempts: number, now: Date): Date {
    return new Date(
      now.getTime() + DeliveryRetrySchedule.FIRST_RETRY_MS * 2 ** attempts,
    );
  }
}
