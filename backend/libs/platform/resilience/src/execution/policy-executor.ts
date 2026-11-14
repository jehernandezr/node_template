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

/** Estado de una llamada mientras se ejecuta. */
interface CallContext<T> {
  readonly call: PolicyCall<T>;
  readonly idempotent: boolean;
  readonly isTransient: (error: unknown) => boolean;
  /** Se aborta con la señal del llamador o cuando vence el plazo de la llamada. */
  readonly signal: AbortSignal;
  readonly deadline?: Deadline;
}

/**
 * Ejecuta una llamada según su política. Orden de composición: plazo total →
 * bulkhead → reintentos (solo llamadas idempotentes) → circuit breaker →
 * tiempo del intento.
 *
 * Regla de reintento: una llamada idempotente se repite cuando la falla es
 * transitoria o cuando su propio intento venció. La espera es el backoff de
 * `RetryPolicy`, al menos la pista `Retry-After` del servidor, y nunca se
 * empieza si no cabe antes del plazo; en ese caso se relanza el último error.
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

  /** El plazo más cercano entre el del llamador y el presupuesto total, si hay alguno. */
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
      // Una llamada en cola puede recibir su cupo después de que el llamador desistió.
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
          // Esperar agotaría todo el presupuesto: se informa la falla real ahora.
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
      // El circuito queda abierto más tiempo que cualquier espera de reintento.
      return false;
    }
    if (
      error instanceof ResilienceTimeoutError &&
      error.scope === TimeoutScope.Attempt
    ) {
      // El resultado es incierto, pero el llamador declaró la llamada idempotente.
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
    // La pista `Retry-After` es una espera mínima para el siguiente intento.
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
   * Corre un intento con su propio tiempo. El temporizador del intento solo se
   * arma si termina antes del plazo de la llamada; si no, el plazo lo corta.
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
        // Cooperativo: la operación respetó el aborto; se informa por qué se abortó.
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
