import {
  ConsecutiveBreaker,
  DelegateBackoff,
  TimeoutStrategy as CockatielTimeoutStrategy,
  bulkhead as createBulkhead,
  circuitBreaker as createCircuitBreaker,
  handleWhen,
  isBrokenCircuitError,
  isBulkheadRejectedError,
  isTaskCancelledError,
  retry as createRetry,
  timeout as createTimeout,
  wrap,
  type BulkheadPolicy,
  type CircuitBreakerPolicy,
  type IDefaultPolicyContext,
  type IDisposable,
  type IPolicy,
  type IRetryBackoffContext,
  type TimeoutPolicy,
} from 'cockatiel';
import {
  defaultPolicies,
  TimeoutStrategy,
  type ResiliencePolicyConfig,
  type ResilienceRetryConfig,
} from './config.js';
import { ResilienceError, ResilienceErrorCode } from './errors.js';
import type {
  ResilienceEvent,
  ResilienceEventDetail,
  ResilienceEventListener,
} from './events.js';
import { ResilienceEventKind, ResiliencePolicyName } from './policy-name.js';
import { isTransientError, retryAfterMs } from './transient.js';

/** Overrides applied on top of {@link defaultPolicies}, per policy name (shallow merge per policy). */
export type ResilienceOverrides = Partial<
  Record<ResiliencePolicyName, Partial<ResiliencePolicyConfig>>
>;

/** Per-call options for {@link ResilienceRegistry.execute}. */
export interface ResilienceCallOptions {
  /** Allow retries. Default false: a call that fails is never repeated. */
  readonly idempotent?: boolean;
  /** Dependency whose breaker and bulkhead are used. Default: the policy name. */
  readonly dependencyKey?: string;
  /** Caller cancellation: stops retries and rejects with the signal's reason. */
  readonly signal?: AbortSignal;
  /** Budget for the whole call, retries included. Overrides the policy default. */
  readonly totalTimeoutMs?: number;
}

type Pipeline = IPolicy<IDefaultPolicyContext, never>;

/** Breaker, bulkhead and timeout shared by all calls to one dependency. */
interface DependencyEntry {
  readonly config: ResiliencePolicyConfig;
  readonly bulkhead?: BulkheadPolicy;
  readonly breaker?: CircuitBreakerPolicy;
  readonly timeout: TimeoutPolicy;
}

/**
 * Exponential backoff with equal jitter: the delay lies between half and the
 * full capped exponential value, and never exceeds `maxDelayMs`.
 * @param retry Retry settings. @param retryNumber 1 for the first retry.
 */
function backoffDelayMs(
  retry: ResilienceRetryConfig,
  retryNumber: number,
): number {
  const exponential = retry.initialDelayMs * 2 ** (retryNumber - 1);
  const capped = Math.min(retry.maxDelayMs, exponential);
  const jittered = capped / 2 + Math.random() * (capped / 2);
  return Math.min(retry.maxDelayMs, Math.round(jittered));
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

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new Error('Resilience call aborted', { cause: signal.reason });
}

/** Rejects as soon as the caller's signal aborts, even if the work is still running. */
function raceWithSignal<T>(
  work: Promise<T>,
  signal: AbortSignal | undefined,
): Promise<T> {
  if (!signal) {
    return work;
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(abortReason(signal));
    signal.addEventListener('abort', onAbort, { once: true });
    work
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', onAbort));
  });
}

/** Maps cockatiel errors to {@link ResilienceError}; other errors pass through unchanged. */
function toResilienceError(
  name: ResiliencePolicyName,
  config: ResiliencePolicyConfig,
  error: unknown,
): unknown {
  if (isBrokenCircuitError(error)) {
    return new ResilienceError(
      ResilienceErrorCode.CircuitOpen,
      `Circuit open for policy "${name}"`,
      {
        cause: error,
        retryAfterMs: config.circuitBreaker?.halfOpenAfterMs,
      },
    );
  }
  if (isTaskCancelledError(error)) {
    return new ResilienceError(
      ResilienceErrorCode.Timeout,
      `Call to policy "${name}" timed out`,
      { cause: error },
    );
  }
  if (isBulkheadRejectedError(error)) {
    return new ResilienceError(
      ResilienceErrorCode.BulkheadFull,
      `Bulkhead full for policy "${name}"`,
      {
        cause: error,
      },
    );
  }
  return error;
}

/**
 * Runs outbound calls through the resilience policy declared for each adapter,
 * and reports what the policies do as events.
 *
 * Composition per call: total budget → bulkhead → retry (idempotent calls only)
 * → circuit breaker → timeout. Breakers and bulkheads are per (policy, dependencyKey).
 */
export class ResilienceRegistry {
  private static defaultRegistry: ResilienceRegistry | undefined;

  private readonly configs = new Map<
    ResiliencePolicyName,
    ResiliencePolicyConfig
  >();
  private readonly entries = new Map<
    ResiliencePolicyName,
    Map<string, DependencyEntry>
  >();
  private readonly listeners = new Set<ResilienceEventListener>();

  /** @param overrides Per-policy settings merged over {@link defaultPolicies}. */
  constructor(overrides: ResilienceOverrides = {}) {
    for (const name of Object.values(ResiliencePolicyName)) {
      this.configs.set(name, { ...defaultPolicies[name], ...overrides[name] });
    }
  }

  /** Registers the registry used by the `@Resilient` decorator. */
  static setDefault(registry: ResilienceRegistry | undefined): void {
    ResilienceRegistry.defaultRegistry = registry;
  }

  /** Returns the registry used by the `@Resilient` decorator, if any. */
  static getDefault(): ResilienceRegistry | undefined {
    return ResilienceRegistry.defaultRegistry;
  }

  /**
   * Runs `fn` under the policy `name`.
   * @param name Policy to apply.
   * @param fn Operation; receives the per-attempt abort signal, which is aborted on timeout or caller abort.
   * @param options Retry, dependency, cancellation and budget options.
   * @throws ResilienceError with code CircuitOpen (with `retryAfterMs`), Timeout or BulkheadFull.
   * Caller aborts reject with the signal's reason; other errors are rethrown as-is.
   */
  async execute<T>(
    name: ResiliencePolicyName,
    fn: (signal: AbortSignal) => Promise<T>,
    options: ResilienceCallOptions = {},
  ): Promise<T> {
    const config = this.configs.get(name);
    if (!config) {
      throw new Error(`Unknown resilience policy "${name}"`);
    }
    const dependencyKey = options.dependencyKey ?? name;
    const signal = options.signal;
    if (signal?.aborted) {
      throw abortReason(signal);
    }

    const entry = this.entryFor(name, dependencyKey, config);
    const isTransient = config.isTransient ?? isTransientError;
    const abortOnReturn = config.abortOnReturn ?? true;
    const totalTimeoutMs = options.totalTimeoutMs ?? config.totalTimeoutMs;
    const subscriptions: IDisposable[] = [];
    const layers: Pipeline[] = [];

    if (totalTimeoutMs !== undefined) {
      const total = createTimeout(totalTimeoutMs, {
        strategy: CockatielTimeoutStrategy.Aggressive,
        abortOnReturn,
      });
      subscriptions.push(
        total.onTimeout(() =>
          this.emit(name, dependencyKey, ResilienceEventKind.Timeout, {
            timeoutMs: totalTimeoutMs,
          }),
        ),
      );
      layers.push(total);
    }
    if (entry.bulkhead) {
      layers.push(entry.bulkhead);
    }
    if (options.idempotent === true && config.retry) {
      const retryConfig = config.retry;
      const retries = createRetry(handleWhen(isTransient), {
        // cockatiel counts retries, not calls: maxAttempts includes the first call.
        maxAttempts: Math.max(0, retryConfig.maxAttempts - 1),
        backoff: new DelegateBackoff<IRetryBackoffContext<unknown>>(
          (context) => {
            // A Retry-After hint is a minimum delay for this attempt.
            const hint =
              'error' in context.result
                ? retryAfterMs(context.result.error)
                : undefined;
            return Math.max(
              backoffDelayMs(retryConfig, context.attempt),
              hint ?? 0,
            );
          },
        ),
      });
      subscriptions.push(
        retries.onRetry((event) =>
          this.emit(name, dependencyKey, ResilienceEventKind.Retry, {
            attempt: event.attempt,
            delayMs: event.delay,
            ...('error' in event ? describeError(event.error) : {}),
          }),
        ),
      );
      layers.push(retries);
    }
    if (entry.breaker) {
      layers.push(entry.breaker);
    }
    layers.push(entry.timeout);

    try {
      const pipeline = wrap(...layers);
      return await raceWithSignal(
        pipeline.execute<T>((context) => {
          // Retry backoff is not abortable, so re-check the caller before every attempt.
          if (signal?.aborted) {
            throw abortReason(signal);
          }
          return fn(context.signal);
        }, signal),
        signal,
      );
    } catch (error) {
      throw toResilienceError(name, config, error);
    } finally {
      for (const subscription of subscriptions) {
        subscription.dispose();
      }
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

    let bulkhead: BulkheadPolicy | undefined;
    if (config.bulkhead) {
      bulkhead = createBulkhead(config.bulkhead.limit, config.bulkhead.queue);
      bulkhead.onReject(() => notify(ResilienceEventKind.BulkheadRejected));
    }

    let breaker: CircuitBreakerPolicy | undefined;
    if (config.circuitBreaker) {
      // Timeouts count as failures for the breaker. Non-transient errors never open it.
      breaker = createCircuitBreaker(
        handleWhen(
          (error) => isTransient(error) || isTaskCancelledError(error),
        ),
        {
          breaker: new ConsecutiveBreaker(
            config.circuitBreaker.consecutiveFailures,
          ),
          halfOpenAfter: config.circuitBreaker.halfOpenAfterMs,
        },
      );
      breaker.onBreak((reason) =>
        notify(
          ResilienceEventKind.Break,
          'error' in reason ? describeError(reason.error) : {},
        ),
      );
      breaker.onHalfOpen(() => notify(ResilienceEventKind.HalfOpen));
      breaker.onReset(() => notify(ResilienceEventKind.Reset));
    }

    const timeout = createTimeout(config.timeoutMs, {
      strategy:
        config.timeoutStrategy === TimeoutStrategy.Cooperative
          ? CockatielTimeoutStrategy.Cooperative
          : CockatielTimeoutStrategy.Aggressive,
      abortOnReturn: config.abortOnReturn ?? true,
    });
    timeout.onTimeout(() =>
      notify(ResilienceEventKind.Timeout, { timeoutMs: config.timeoutMs }),
    );

    return { config, bulkhead, breaker, timeout };
  }

  private emit(
    policy: ResiliencePolicyName,
    dependencyKey: string,
    kind: ResilienceEventKind,
    detail?: ResilienceEventDetail,
  ): void {
    const event: ResilienceEvent = {
      policy,
      dependencyKey,
      kind,
      at: Date.now(),
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
