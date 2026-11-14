import { PlatformErrorCode } from '@contracts/platform';
import {
  type BackoffOptions,
  BackoffStrategy,
  backoffDelay,
  MAX_BACKOFF_ATTEMPT,
} from '@platform/primitives';
import { MessagingError } from '../errors/messaging-error.js';

/**
 * Delay before retry number `attempt` (1-based) with the shared backoff. Attempts
 * above `MAX_BACKOFF_ATTEMPT` use that cap (the delay is already at `maxMs`), so a
 * queue with many receives never throws here.
 */
export function messagingBackoffDelay(
  attempt: number,
  options: BackoffOptions,
): number {
  const bounded = Number.isInteger(attempt)
    ? Math.min(attempt, MAX_BACKOFF_ATTEMPT)
    : attempt;
  return backoffDelay(bounded, options);
}

/** Options for {@link RetryPolicy.exponential}. */
export interface ExponentialRetryOptions {
  /** Total deliveries allowed, including the first one. */
  readonly maxAttempts: number;
  readonly baseMs: number;
  readonly maxMs: number;
  /** Full jitter. Defaults to true. */
  readonly jitter?: boolean;
}

/** Retry configuration of a queue. */
export class RetryPolicy {
  readonly maxAttempts: number;
  readonly baseMs: number;
  readonly maxMs: number;
  readonly jitter: boolean;

  private constructor(options: Required<ExponentialRetryOptions>) {
    this.maxAttempts = options.maxAttempts;
    this.baseMs = options.baseMs;
    this.maxMs = options.maxMs;
    this.jitter = options.jitter;
  }

  /** Exponential backoff with optional full jitter. */
  static exponential(options: ExponentialRetryOptions): RetryPolicy {
    const { maxAttempts, baseMs, maxMs } = options;
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
      throw new MessagingError(
        PlatformErrorCode.MessagingInvalidRetryPolicy,
        `maxAttempts must be an integer >= 1, got ${maxAttempts}`,
      );
    }
    if (!(baseMs > 0) || !Number.isFinite(baseMs)) {
      throw new MessagingError(
        PlatformErrorCode.MessagingInvalidRetryPolicy,
        `baseMs must be > 0, got ${baseMs}`,
      );
    }
    if (!(maxMs >= baseMs) || !Number.isFinite(maxMs)) {
      throw new MessagingError(
        PlatformErrorCode.MessagingInvalidRetryPolicy,
        `maxMs must be finite and >= baseMs, got ${maxMs}`,
      );
    }
    return new RetryPolicy({
      maxAttempts,
      baseMs,
      maxMs,
      jitter: options.jitter ?? true,
    });
  }

  /** The policy curve as shared `@platform/primitives` backoff options. */
  backoff(random?: () => number): BackoffOptions {
    return {
      strategy: this.jitter ? BackoffStrategy.FullJitter : BackoffStrategy.None,
      baseMs: this.baseMs,
      maxMs: this.maxMs,
      ...(random === undefined ? {} : { random }),
    };
  }

  /** Delay before retry number `attempt` according to this policy. */
  delayMs(attempt: number, random?: () => number): number {
    return messagingBackoffDelay(attempt, this.backoff(random));
  }
}
