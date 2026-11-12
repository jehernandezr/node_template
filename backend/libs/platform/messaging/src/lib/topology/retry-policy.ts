import {
  MessagingError,
  MessagingErrorCode,
} from '../errors/messaging-error.js';

/** Parameters of the exponential backoff curve. */
export interface BackoffOptions {
  readonly baseMs: number;
  readonly maxMs: number;
  /** Full jitter: the delay is uniform in [0, ceiling). Defaults to false here. */
  readonly jitter?: boolean;
  /** Source of randomness in [0, 1). Defaults to `Math.random`. */
  readonly random?: () => number;
}

/**
 * Delay before retry number `attempt` (1-based).
 * Without jitter: min(maxMs, baseMs * 2^(attempt - 1)).
 * With jitter: a uniform value in [0, that ceiling].
 */
export function backoffDelayMs(
  attempt: number,
  options: BackoffOptions,
): number {
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new RangeError(`attempt must be an integer >= 1, got ${attempt}`);
  }
  const { baseMs, maxMs, jitter = false, random = Math.random } = options;
  const ceiling = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
  return jitter ? Math.floor(random() * ceiling) : ceiling;
}

/** Options for {@link RetryPolicy.exponential}. */
export interface ExponentialRetryOptions {
  /** Total deliveries allowed, including the first one. */
  readonly maxAttempts: number;
  readonly baseMs: number;
  readonly maxMs: number;
  /** Defaults to true. */
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
        MessagingErrorCode.InvalidRetryPolicy,
        `maxAttempts must be an integer >= 1, got ${maxAttempts}`,
      );
    }
    if (!(baseMs > 0) || !Number.isFinite(baseMs)) {
      throw new MessagingError(
        MessagingErrorCode.InvalidRetryPolicy,
        `baseMs must be > 0, got ${baseMs}`,
      );
    }
    if (!(maxMs >= baseMs) || !Number.isFinite(maxMs)) {
      throw new MessagingError(
        MessagingErrorCode.InvalidRetryPolicy,
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

  /** Delay before retry number `attempt` according to this policy. */
  delayMs(attempt: number, random?: () => number): number {
    return backoffDelayMs(attempt, {
      baseMs: this.baseMs,
      maxMs: this.maxMs,
      jitter: this.jitter,
      random,
    });
  }
}
