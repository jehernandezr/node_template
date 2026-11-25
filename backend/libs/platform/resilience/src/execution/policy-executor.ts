import type { Clock, RandomSource } from '@platform/kernel';
import {
  Backoff,
  Deadline,
  FailureClassifier,
  TimerScheduler,
} from '@platform/primitives';
import { CircuitOpenError } from '../errors/circuit-open.error.js';
import { ResilienceTimeoutError } from '../errors/resilience-timeout.error.js';
import { TimeoutScope } from '../errors/timeout-scope.enum.js';
import { ErrorEventDetail } from '../events/error-event-detail.js';
import type { ResilienceEventBus } from '../events/resilience-event-bus.js';
import { ResilienceEventKind } from '../events/resilience-event-kind.enum.js';
import type { ResilienceEventDetail } from '../events/resilience-event.js';
import { TimeoutStrategy } from '../policy/timeout-strategy.enum.js';
import type {
  ResilienceRetryConfig,
  ResiliencePolicyConfig,
} from '../policy/resilience-policy-config.js';
import { AbortableWait } from './abortable-wait.js';
import type { PolicyCall } from './policy-call.js';
import type { ResilienceCallOptions } from './resilience-call.options.js';
import { RetryAfterHint } from './retry-after-hint.js';

/** State of a call while it runs. */
interface CallContext<T> {
  readonly call: PolicyCall<T>;
  readonly idempotent: boolean;
  readonly isTransient: (error: unknown) => boolean;
  /** Aborted with the caller's signal or when the call's deadline expires. */
  readonly signal: AbortSignal;
  readonly deadline?: Deadline;
}

/**
 * Runs a call according to its policy. Composition order: total deadline →
 * bulkhead → retries (idempotent calls only) → circuit breaker →
 * attempt timeout.
 *
 * Retry rule: an idempotent call is repeated when the failure is
 * transient or when its own attempt timed out. The wait is the backoff of
 * `RetryPolicy`, at least the server's `Retry-After` hint, and it is never
 * started if it does not fit before the deadline; in that case the last error is rethrown.
 */
export class PolicyExecutor {
  constructor(
    private readonly clock: Clock,
    private readonly random: RandomSource,
    private readonly events: ResilienceEventBus,
    private readonly classifier: FailureClassifier,
    private readonly retryAfter: RetryAfterHint,
  ) {}

  async run<T>(call: PolicyCall<T>): Promise<T> {
    const { options, config } = call;
    const callerSignal = options.signal;
    if (callerSignal?.aborted === true) {
      throw TimerScheduler.abortReason(callerSignal);
    }
    const deadline = this.callDeadline(config, options);
    const budgetMs = deadline?.remainingMs();
    if (budgetMs === 0) {
      this.emit(call, ResilienceEventKind.Timeout, { timeoutMs: 0 });
      throw new ResilienceTimeoutError(call.name.value, TimeoutScope.Total, 0);
    }

    const controller = new AbortController();
    const onCallerAbort = (): void => {
      controller.abort(TimerScheduler.abortReason(callerSignal as AbortSignal));
    };
    callerSignal?.addEventListener('abort', onCallerAbort, { once: true });
    const cancelBudget =
      budgetMs === undefined
        ? undefined
        : TimerScheduler.arm(budgetMs, () => {
            this.emit(call, ResilienceEventKind.Timeout, {
              timeoutMs: budgetMs,
            });
            controller.abort(
              new ResilienceTimeoutError(
                call.name.value,
                TimeoutScope.Total,
                budgetMs,
              ),
            );
          });

    const context: CallContext<T> = {
      call,
      idempotent: options.idempotent === true,
      isTransient:
        config.isTransient ??
        ((error: unknown): boolean => this.classifier.isTransient(error)),
      signal: controller.signal,
      deadline,
    };
    try {
      return await AbortableWait.until(
        () => this.runBulkhead(context),
        controller.signal,
      );
    } finally {
      cancelBudget?.();
      callerSignal?.removeEventListener('abort', onCallerAbort);
    }
  }

  /** The nearest deadline between the caller's and the total budget, if any. */
  private callDeadline(
    config: ResiliencePolicyConfig,
    options: ResilienceCallOptions,
  ): Deadline | undefined {
    const totalMs = options.totalTimeoutMs ?? config.totalTimeoutMs;
    const fromBudget =
      totalMs === undefined ? undefined : Deadline.after(totalMs, this.clock);
    if (options.deadline && fromBudget) {
      return options.deadline.min(fromBudget);
    }
    return options.deadline ?? fromBudget;
  }

  private async runBulkhead<T>(context: CallContext<T>): Promise<T> {
    const bulkhead = context.call.entry.bulkhead;
    if (!bulkhead) {
      return this.runAttempts(context);
    }
    return bulkhead.execute(() => {
      // A queued call can receive its slot after the caller gave up.
      if (context.signal.aborted) {
        throw TimerScheduler.abortReason(context.signal);
      }
      return this.runAttempts(context);
    }, context.signal);
  }

  private async runAttempts<T>(context: CallContext<T>): Promise<T> {
    const retry = context.idempotent ? context.call.config.retry : undefined;
    const maxAttempts = retry?.policy.maxAttempts ?? 1;
    for (let attempt = 1; ; attempt += 1) {
      if (context.signal.aborted) {
        throw TimerScheduler.abortReason(context.signal);
      }
      try {
        return await this.runAttempt(context, attempt);
      } catch (error) {
        if (context.signal.aborted) {
          throw TimerScheduler.abortReason(context.signal);
        }
        if (
          retry === undefined ||
          attempt >= maxAttempts ||
          !this.shouldRetry(context, error)
        ) {
          throw error;
        }
        const delayMs = this.retryDelay(retry, attempt, error);
        if (
          context.deadline !== undefined &&
          delayMs >= context.deadline.remainingMs()
        ) {
          // Waiting would exhaust the whole budget: the real failure is reported now.
          throw error;
        }
        this.emit(context.call, ResilienceEventKind.Retry, {
          attempt,
          delayMs,
          ...ErrorEventDetail.of(error),
        });
        await AbortableWait.sleep(delayMs, context.signal);
      }
    }
  }

  private shouldRetry<T>(context: CallContext<T>, error: unknown): boolean {
    if (error instanceof CircuitOpenError) {
      // The circuit stays open longer than any retry wait.
      return false;
    }
    if (
      error instanceof ResilienceTimeoutError &&
      error.scope === TimeoutScope.Attempt
    ) {
      // The result is uncertain, but the caller declared the call idempotent.
      return true;
    }
    return context.isTransient(error);
  }

  private retryDelay(
    retry: ResilienceRetryConfig,
    attempt: number,
    error: unknown,
  ): number {
    const backoff = new Backoff(retry.policy, this.random).delay(attempt);
    // The `Retry-After` hint is a minimum wait for the next attempt.
    const hint = this.retryAfter.hintMs(error, retry.maxRetryAfterMs);
    return Math.max(backoff, hint ?? 0);
  }

  private async runAttempt<T>(
    context: CallContext<T>,
    attempt: number,
  ): Promise<T> {
    const breaker = context.call.entry.breaker;
    if (!breaker) {
      return this.runTimedAttempt(context, attempt);
    }
    return breaker.execute(() => this.runTimedAttempt(context, attempt));
  }

  /**
   * Runs an attempt with its own timeout. The attempt timer is only
   * armed if it ends before the call's deadline; otherwise, the deadline cuts it.
   */
  private async runTimedAttempt<T>(
    context: CallContext<T>,
    attempt: number,
  ): Promise<T> {
    const { call, deadline } = context;
    const { config } = call;
    const attemptDeadline = deadline
      ? deadline.child(config.timeoutMs)
      : Deadline.after(config.timeoutMs, this.clock);
    const controller = new AbortController();
    const forward = (): void => {
      controller.abort(context.signal.reason);
    };
    if (context.signal.aborted) {
      forward();
    } else {
      context.signal.addEventListener('abort', forward, { once: true });
    }
    let cancelTimer: (() => void) | undefined;
    if (deadline === undefined || config.timeoutMs < deadline.remainingMs()) {
      cancelTimer = TimerScheduler.arm(config.timeoutMs, () => {
        this.emit(call, ResilienceEventKind.Timeout, {
          timeoutMs: config.timeoutMs,
        });
        controller.abort(
          new ResilienceTimeoutError(
            call.name.value,
            TimeoutScope.Attempt,
            config.timeoutMs,
          ),
        );
      });
    }

    const run = (): Promise<T> =>
      Promise.resolve().then(() =>
        call.fn(controller.signal, {
          number: attempt,
          deadline: attemptDeadline,
        }),
      );
    try {
      if (config.timeoutStrategy !== TimeoutStrategy.Cooperative) {
        return await AbortableWait.until(run, controller.signal);
      }
      try {
        return await run();
      } catch (error) {
        // Cooperative: the operation honored the abort; the reason for the abort is reported.
        throw controller.signal.aborted
          ? TimerScheduler.abortReason(controller.signal)
          : error;
      }
    } finally {
      cancelTimer?.();
      context.signal.removeEventListener('abort', forward);
      if (config.abortOnReturn ?? true) {
        controller.abort();
      }
    }
  }

  private emit<T>(
    call: PolicyCall<T>,
    kind: ResilienceEventKind,
    detail?: ResilienceEventDetail,
  ): void {
    this.events.publish(call.name.value, call.dependencyKey, kind, detail);
  }
}
