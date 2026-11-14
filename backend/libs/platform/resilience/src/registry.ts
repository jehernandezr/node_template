import { SystemClock, type Clock } from '@platform/kernel';
import {
  abortableSleep,
  abortReason,
  armTimer,
  backoffDelay,
  BackoffStrategy,
  Deadline,
  DEFAULT_RETRY_AFTER_MAX_MS,
  isTransientError,
  raceDeadline,
} from '@platform/primitives';
import { Bulkhead } from './bulkhead.js';
import { ConsecutiveCircuitBreaker } from './circuit-breaker.js';
import {
  defaultPolicies,
  TimeoutStrategy,
  validatePolicyConfig,
  type ResiliencePolicyConfig,
  type ResilienceRetryConfig,
} from './config.js';
import {
  BulkheadFullError,
  CircuitOpenError,
  ResilienceTimeoutError,
  TimeoutScope,
  UnknownPolicyError,
} from './errors.js';
import type {
  ResilienceEventDetail,
  ResilienceEventListener,
} from './events.js';
import { ResilienceEventKind, ResiliencePolicyName } from './policy-name.js';
import { retryAfterHintMs } from './transient.js';

/** Overrides applied on top of {@link defaultPolicies}, per policy name (shallow merge per policy). */
export type ResilienceOverrides = Partial<
  Record<ResiliencePolicyName, Partial<ResiliencePolicyConfig>>
>;

/** Collaborators of {@link ResilienceRegistry}. All optional. */
export interface ResilienceRegistryOptions {
  /**
   * Time source for deadlines, `Retry-After` dates, event timestamps and the
   * breaker's half-open wait. Default: `SystemClock`.
   */
  readonly clock?: Clock;
  /** Random source in `[0, 1)` for the backoff jitter. Default: `Math.random`. */
  readonly random?: () => number;
}

/** Per-call options for {@link ResilienceRegistry.execute}. */
export interface ResilienceCallOptions {
  /** Allow retries. Default false: a call that fails is never repeated. */
  readonly idempotent?: boolean;
  /** Dependency whose breaker and bulkhead are used. Default: the policy name. */
  readonly dependencyKey?: string;
  /** Caller cancellation: stops retries, cancels pending waits and rejects with the signal's reason. */
  readonly signal?: AbortSignal;
  /**
   * Caller deadline. The whole call, retries and waits included, never runs
   * past it; when the policy also has a total budget, the nearest one wins.
   */
  readonly deadline?: Deadline;
  /** Budget for the whole call, retries included. Overrides the policy default. */
  readonly totalTimeoutMs?: number;
}

/** What the operation learns about the attempt it is running. */
export interface ResilienceAttempt {
  /** Attempt number, starting at 1. */
  readonly number: number;
  /**
   * Limit of this attempt: `deadline.child(timeoutMs)` of the call deadline,
   * or `timeoutMs` from now when the call has no deadline. Pass it downstream.
   */
  readonly deadline: Deadline;
}

/** Operation run by {@link ResilienceRegistry.execute}. */
export type ResilientOperation<T> = (
  signal: AbortSignal,
  attempt: ResilienceAttempt,
) => Promise<T>;

/** Breaker and bulkhead shared by all calls to one dependency. */
interface DependencyEntry {
  readonly bulkhead?: Bulkhead;
  readonly breaker?: ConsecutiveCircuitBreaker;
}

/** State of one `execute` call. */
interface CallContext<T> {
  readonly name: ResiliencePolicyName;
  readonly dependencyKey: string;
  readonly config: ResiliencePolicyConfig;
  readonly entry: DependencyEntry;
  readonly fn: ResilientOperation<T>;
  readonly idempotent: boolean;
  readonly isTransient: (error: unknown) => boolean;
  /** Aborted by the caller's signal or when the call deadline expires. */
  readonly signal: AbortSignal;
  readonly deadline?: Deadline;
}

/** Extracts only primitive, non-sensitive fields from an error. */
function describeError(
  error: unknown,
): Pick<ResilienceEventDetail, 'errorName' | 'errorCode'> {
  if (typeof error !== 'object' || error === null) {
    return {};
  }
  const candidate = error as { name?: unknown; code?: unknown };
  return {
    errorName: typeof candidate.name === 'string' ? candidate.name : undefined,
    errorCode:
      typeof candidate.code === 'string' || typeof candidate.code === 'number'
        ? String(candidate.code)
        : undefined,
  };
}

/**
 * Runs `work` until it settles or `signal` aborts, whichever comes first. On
 * abort it rejects with the signal's reason even if the work keeps running.
 */
async function untilAborted<T>(
  work: () => Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  const result = await raceDeadline(work, { signal });
  if (result.settled) {
    return result.value;
  }
  throw abortReason(signal);
}

/**
 * Runs outbound calls through the resilience policy declared for each adapter,
 * and reports what the policies do as events.
 *
 * Composition per call: deadline (caller deadline and/or total budget) →
 * bulkhead → retry (idempotent calls only) → circuit breaker → attempt timeout.
 * Breakers and bulkheads are per (policy, dependencyKey).
 *
 * Retry rule (the only one): an idempotent call is repeated when the failure is
 * transient for `config.isTransient` (default `isTransientError` from
 * `@platform/primitives`) or when its own attempt timed out. The wait is the
 * primitives backoff, at least the server's `Retry-After` (bounded by
 * `maxRetryAfterMs`), and it is never started if it would not fit before the
 * deadline; in that case the last error is rethrown.
 */
export class ResilienceRegistry {
  private readonly configs = new Map<
    ResiliencePolicyName,
    ResiliencePolicyConfig
  >();
  private readonly entries = new Map<
    ResiliencePolicyName,
    Map<string, DependencyEntry>
  >();
  private readonly listeners = new Set<ResilienceEventListener>();
  private readonly clock: Clock;
  private readonly random: () => number;

  /**
   * @param overrides Per-policy settings merged over {@link defaultPolicies}.
   * @param options Clock and random source.
   * @throws InvalidArgumentError when a merged policy is invalid.
   */
  constructor(
    overrides: ResilienceOverrides = {},
    options: ResilienceRegistryOptions = {},
  ) {
    this.clock = options.clock ?? new SystemClock();
    this.random = options.random ?? Math.random;
    for (const name of Object.values(ResiliencePolicyName)) {
      const config = { ...defaultPolicies[name], ...overrides[name] };
      validatePolicyConfig(config);
      this.configs.set(name, config);
    }
  }

  /**
   * Runs `fn` under the policy `name`.
   * @param name Policy to apply.
   * @param fn Operation; receives the per-attempt abort signal (aborted on
   *   timeout, deadline or caller abort) and the attempt with its child deadline.
   * @param options Retry, dependency, cancellation, deadline and budget options.
   * @throws CircuitOpenError (with `retryAfterMs`), ResilienceTimeoutError or
   *   BulkheadFullError, all `ResilienceError`. Caller aborts reject with the
   *   signal's reason; other errors are rethrown as-is.
   */
  async execute<T>(
    name: ResiliencePolicyName,
    fn: ResilientOperation<T>,
    options: ResilienceCallOptions = {},
  ): Promise<T> {
    const config = this.configs.get(name);
    if (!config) {
      throw new UnknownPolicyError(name);
    }
    const callerSignal = options.signal;
    if (callerSignal?.aborted) {
      throw abortReason(callerSignal);
    }
    const dependencyKey = options.dependencyKey ?? name;
    const deadline = this.callDeadline(config, options);
    const budgetMs = deadline?.remaining();
    if (budgetMs === 0) {
      this.emit(name, dependencyKey, ResilienceEventKind.Timeout, {
        timeoutMs: 0,
      });
      throw new ResilienceTimeoutError(name, TimeoutScope.Total, 0);
    }

    const call = new AbortController();
    const onCallerAbort = (): void => {
      call.abort(abortReason(callerSignal as AbortSignal));
    };
    callerSignal?.addEventListener('abort', onCallerAbort, { once: true });
    const cancelBudget =
      budgetMs === undefined
        ? undefined
        : armTimer(budgetMs, () => {
            this.emit(name, dependencyKey, ResilienceEventKind.Timeout, {
              timeoutMs: budgetMs,
            });
            call.abort(
              new ResilienceTimeoutError(name, TimeoutScope.Total, budgetMs),
            );
          });

    const context: CallContext<T> = {
      name,
      dependencyKey,
      config,
      entry: this.entryFor(name, dependencyKey, config),
      fn,
      idempotent: options.idempotent === true,
      isTransient: config.isTransient ?? isTransientError,
      signal: call.signal,
      deadline,
    };
    try {
      return await untilAborted(() => this.runBulkhead(context), call.signal);
    } finally {
      cancelBudget?.();
      callerSignal?.removeEventListener('abort', onCallerAbort);
    }
  }

  /**
   * Subscribes to policy events.
   * @param listener Called for every event. Sync throws and async rejections are ignored so metrics cannot break calls.
   * @returns Function that removes the listener.
   */
  onEvent(listener: ResilienceEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Nearest of the caller deadline and the total budget, if any. */
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
    const bulkhead = context.entry.bulkhead;
    if (!bulkhead) {
      return this.runAttempts(context);
    }
    return bulkhead.execute(() => {
      // A queued call may get its slot after the caller gave up.
      if (context.signal.aborted) {
        throw abortReason(context.signal);
      }
      return this.runAttempts(context);
    }, context.signal);
  }

  private async runAttempts<T>(context: CallContext<T>): Promise<T> {
    const retry = context.idempotent ? context.config.retry : undefined;
    const maxAttempts = retry?.maxAttempts ?? 1;
    for (let attempt = 1; ; attempt += 1) {
      if (context.signal.aborted) {
        throw abortReason(context.signal);
      }
      try {
        return await this.runAttempt(context, attempt);
      } catch (error) {
        if (context.signal.aborted) {
          throw abortReason(context.signal);
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
          delayMs >= context.deadline.remaining()
        ) {
          // Waiting would spend the whole budget: report the real failure now.
          throw error;
        }
        this.emit(
          context.name,
          context.dependencyKey,
          ResilienceEventKind.Retry,
          { attempt, delayMs, ...describeError(error) },
        );
        await abortableSleep(delayMs, { signal: context.signal });
      }
    }
  }

  private shouldRetry<T>(context: CallContext<T>, error: unknown): boolean {
    if (error instanceof CircuitOpenError) {
      // The breaker stays open longer than any retry wait.
      return false;
    }
    if (
      error instanceof ResilienceTimeoutError &&
      error.scope === TimeoutScope.Attempt
    ) {
      // The outcome is uncertain, but the caller declared the call idempotent.
      return true;
    }
    return context.isTransient(error);
  }

  private retryDelay(
    retry: ResilienceRetryConfig,
    attempt: number,
    error: unknown,
  ): number {
    const backoff = backoffDelay(attempt, {
      strategy: BackoffStrategy.EqualJitter,
      baseMs: retry.initialDelayMs,
      maxMs: retry.maxDelayMs,
      random: this.random,
    });
    // A Retry-After hint is a minimum delay for this attempt.
    const hint = retryAfterHintMs(error, {
      maxMs: retry.maxRetryAfterMs ?? DEFAULT_RETRY_AFTER_MAX_MS,
      nowMs: this.clock.now().getTime(),
    });
    return Math.max(backoff, hint ?? 0);
  }

  private async runAttempt<T>(
    context: CallContext<T>,
    attempt: number,
  ): Promise<T> {
    const breaker = context.entry.breaker;
    if (!breaker) {
      return this.runTimedAttempt(context, attempt);
    }
    return breaker.execute(() => this.runTimedAttempt(context, attempt));
  }

  /**
   * Runs one attempt with its own timeout. The attempt timer is only armed
   * when it ends before the call deadline; otherwise the deadline cuts it.
   */
  private async runTimedAttempt<T>(
    context: CallContext<T>,
    attempt: number,
  ): Promise<T> {
    const { config, deadline } = context;
    const attemptDeadline = deadline
      ? deadline.child(config.timeoutMs)
      : Deadline.after(config.timeoutMs, this.clock);
    const controller = new AbortController();
    const forward = (): void => controller.abort(context.signal.reason);
    if (context.signal.aborted) {
      forward();
    } else {
      context.signal.addEventListener('abort', forward, { once: true });
    }
    let cancelTimer: (() => void) | undefined;
    if (deadline === undefined || config.timeoutMs < deadline.remaining()) {
      cancelTimer = armTimer(config.timeoutMs, () => {
        this.emit(
          context.name,
          context.dependencyKey,
          ResilienceEventKind.Timeout,
          { timeoutMs: config.timeoutMs },
        );
        controller.abort(
          new ResilienceTimeoutError(
            context.name,
            TimeoutScope.Attempt,
            config.timeoutMs,
          ),
        );
      });
    }

    const run = (): Promise<T> =>
      Promise.resolve().then(() =>
        context.fn(controller.signal, {
          number: attempt,
          deadline: attemptDeadline,
        }),
      );
    try {
      if (config.timeoutStrategy !== TimeoutStrategy.Cooperative) {
        return await untilAborted(run, controller.signal);
      }
      try {
        return await run();
      } catch (error) {
        // Cooperative: the operation honored the abort; report why it was aborted.
        throw controller.signal.aborted
          ? abortReason(controller.signal)
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

  private entryFor(
    name: ResiliencePolicyName,
    dependencyKey: string,
    config: ResiliencePolicyConfig,
  ): DependencyEntry {
    let byDependency = this.entries.get(name);
    if (!byDependency) {
      byDependency = new Map();
      this.entries.set(name, byDependency);
    }
    let entry = byDependency.get(dependencyKey);
    if (!entry) {
      entry = this.createEntry(name, dependencyKey, config);
      byDependency.set(dependencyKey, entry);
    }
    return entry;
  }

  private createEntry(
    name: ResiliencePolicyName,
    dependencyKey: string,
    config: ResiliencePolicyConfig,
  ): DependencyEntry {
    const notify = (
      kind: ResilienceEventKind,
      detail?: ResilienceEventDetail,
    ): void => this.emit(name, dependencyKey, kind, detail);
    const isTransient = config.isTransient ?? isTransientError;

    const bulkheadConfig = config.bulkhead;
    const bulkhead =
      bulkheadConfig === undefined
        ? undefined
        : new Bulkhead({
            limit: bulkheadConfig.limit,
            queue: bulkheadConfig.queue,
            rejectWith: () => new BulkheadFullError(name, dependencyKey),
            onReject: () => notify(ResilienceEventKind.BulkheadRejected),
          });

    const breakerConfig = config.circuitBreaker;
    const breaker =
      breakerConfig === undefined
        ? undefined
        : new ConsecutiveCircuitBreaker({
            consecutiveFailures: breakerConfig.consecutiveFailures,
            halfOpenAfterMs: breakerConfig.halfOpenAfterMs,
            clock: this.clock,
            // Attempt timeouts count as failures. Non-transient errors, caller
            // aborts and an exhausted caller deadline never open the circuit.
            counts: (error) =>
              (error instanceof ResilienceTimeoutError &&
                error.scope === TimeoutScope.Attempt) ||
              (!(error instanceof ResilienceTimeoutError) &&
                isTransient(error)),
            rejectWith: () =>
              new CircuitOpenError(name, dependencyKey, {
                retryAfterMs: breakerConfig.halfOpenAfterMs,
              }),
            onBreak: (error) =>
              notify(ResilienceEventKind.Break, describeError(error)),
            onHalfOpen: () => notify(ResilienceEventKind.HalfOpen),
            onReset: () => notify(ResilienceEventKind.Reset),
          });

    return { bulkhead, breaker };
  }

  private emit(
    policy: ResiliencePolicyName,
    dependencyKey: string,
    kind: ResilienceEventKind,
    detail?: ResilienceEventDetail,
  ): void {
    const event = {
      policy,
      dependencyKey,
      kind,
      at: this.clock.now().getTime(),
      detail,
    };
    for (const listener of this.listeners) {
      try {
        void Promise.resolve(listener(event)).catch(() => undefined);
      } catch {
        // A failing metrics listener must not break the protected call.
      }
    }
  }
}
