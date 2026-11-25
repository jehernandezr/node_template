/**
 * When a delivery's next attempt is due. `NotifyUser` sends as soon as it commits, so the first
 * retry waits a margin so as not to compete with that send; after that, each failure doubles the wait.
 * Pure utility.
 */
export class DeliveryRetrySchedule {
  static readonly FIRST_RETRY_MS = 2 * 60_000;

  static firstRetryAt(now: Date): Date {
    return new Date(now.getTime() + DeliveryRetrySchedule.FIRST_RETRY_MS);
  }

  static afterFailure(attempts: number, now: Date): Date {
    return new Date(
      now.getTime() + DeliveryRetrySchedule.FIRST_RETRY_MS * 2 ** attempts,
    );
  }
}
