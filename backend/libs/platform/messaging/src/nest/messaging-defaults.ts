import { BackoffStrategy, RetryPolicy } from '@platform/primitives';

const DAY_MS = 86_400_000;

/** Default values of `MessagingModule`. */
export class MessagingDefaults {
  /** Ten attempts, from 1 s to 5 min, with full jitter. */
  static readonly RELAY_RETRY_POLICY = new RetryPolicy(
    10,
    1_000,
    300_000,
    BackoffStrategy.FullJitter,
  );
  static readonly OUTBOX_RETENTION_MS = 7 * DAY_MS;
  static readonly PROCESSED_RETENTION_MS = 30 * DAY_MS;
}
