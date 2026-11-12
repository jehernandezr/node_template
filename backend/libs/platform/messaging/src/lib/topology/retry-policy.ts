import {
  type BackoffOptions as SharedBackoffOptions,
  BackoffStrategy,
  backoffDelay,
  MAX_BACKOFF_ATTEMPT,
} from '@platform/primitives';
import {
  MessagingError,
  MessagingErrorCode,
} from '../errors/messaging-error.js';

/**
 * Old messaging backoff shape: exponential with factor 2 and optional full jitter.
 * @deprecated Use `BackoffOptions` from `@platform/primitives` with a `BackoffStrategy`.
 */
export interface LegacyBackoffOptions {
  readonly baseMs: number;
  readonly maxMs: number;
  /** Full jitter: the delay is uniform in [0, ceiling). Defaults to false here. */
  readonly jitter?: boolean;
  /** Source of randomness in [0, 1). Defaults to `Math.random`. */
  readonly random?: () => number;
}

/**
 * @deprecated Alias of {@link LegacyBackoffOptions}. Use `BackoffOptions` from
 * `@platform/primitives`.
 */
export type BackoffOptions = LegacyBackoffOptions;

/** Backoff accepted by messaging: the shared shape or the deprecated one. */
export type MessagingBackoffOptions =
  SharedBackoffOptions | LegacyBackoffOptions;

/** Converts any accepted backoff shape to the shared `@platform/primitives` one. */
export function toSharedBackoff(
  options: MessagingBackoffOptions,
): SharedBackoffOptions {
  if ('strategy' in options) return options;
  return {
    strategy: options.jitter
      ? BackoffStrategy.FullJitter
      : BackoffStrategy.None,
    baseMs: options.baseMs,
    maxMs: options.maxMs,
    ...(options.random === undefined ? {} : { random: options.random }),
  };
}

/**
 * Delay before retry number `attempt` (1-based) with the shared backoff. Attempts
 * above `MAX_BACKOFF_ATTEMPT` use that cap (the delay is already at `maxMs`), so a
 * queue with many receives never throws here.
 */
export function messagingBackoffDelay(
  attempt: number,
  options: MessagingBackoffOptions,
): number {
  const bounded = Number.isInteger(attempt)
    ? Math.min(attempt, MAX_BACKOFF_ATTEMPT)
    : attempt;
  return backoffDelay(bounded, toSharedBackoff(options));
}

/**
 * Delay before retry number `attempt` (1-based).
 * @deprecated Use `backoffDelay` from `@platform/primitives`.
 */
export function backoffDelayMs(
  attempt: number,
  options: LegacyBackoffOptions,
): number {
  return messagingBackoffDelay(attempt, options);
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

  /** The policy curve as shared `@platform/primitives` backoff options. */
  backoff(random?: () => number): SharedBackoffOptions {
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
