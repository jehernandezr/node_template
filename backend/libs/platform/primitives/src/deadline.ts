import type { Clock } from '@platform/kernel';
import { DeadlineExceededError } from './errors/deadline-exceeded.error.js';
import { InvalidArgumentError } from './errors/invalid-argument.error.js';
import { PrimitivesGuard } from './errors/primitives-guard.js';
import { TimerScheduler } from './waiting/timer-scheduler.js';

/**
 * Deadline instant of an operation, in absolute epoch milliseconds. Being
 * absolute, it travels between processes without accumulating error, and a child never exceeds the
 * parent. Time is read from the kernel `Clock`.
 */
export class Deadline {
  /** Deadline instant in epoch milliseconds. */
  readonly atMs: number;

  /**
   * @param budgetMs Milliseconds from now until the deadline. Finite and non-negative.
   * @param clock Time source.
   * @param atMs Absolute instant that replaces the budget; used by `at`, `child` and `min`.
   */
  constructor(
    budgetMs: number,
    private readonly clock: Clock,
    atMs?: number,
  ) {
    PrimitivesGuard.instance.nonNegativeFinite('budgetMs', budgetMs);
    this.atMs = atMs ?? clock.now().getTime() + budgetMs;
  }

  /**
   * Returns a deadline at an absolute instant (epoch milliseconds).
   * @param atMs Instant in epoch milliseconds.
   * @param clock Time source.
   * @returns The deadline.
   */
  static at(atMs: number, clock: Clock): Deadline {
    if (!Number.isFinite(atMs)) {
      throw new InvalidArgumentError('atMs', 'a finite epoch in milliseconds');
    }
    return new Deadline(0, clock, atMs);
  }

  /**
   * Returns a deadline `budgetMs` milliseconds from now.
   * @param budgetMs Milliseconds from now.
   * @param clock Time source.
   * @returns The deadline.
   */
  static after(budgetMs: number, clock: Clock): Deadline {
    return new Deadline(budgetMs, clock);
  }

  /**
   * Returns the remaining milliseconds; 0 if already expired.
   * @returns The remaining milliseconds.
   */
  remainingMs(): number {
    return Math.max(0, this.atMs - this.clock.now().getTime());
  }

  /**
   * Whether the deadline has already passed.
   * @returns `true` when expired.
   */
  isExpired(): boolean {
    return this.remainingMs() === 0;
  }

  /** Throws `DeadlineExceededError` if the deadline has already passed. */
  throwIfExpired(): void {
    if (this.isExpired()) {
      throw new DeadlineExceededError(this.atMs);
    }
  }

  /**
   * Returns a deadline for a sub-operation: `budgetMs` from now, capped at its own
   * deadline. Used to reserve time (for example, to compensate) within the
   * parent's budget.
   * @param budgetMs Budget of the sub-operation.
   * @returns The child deadline.
   */
  child(budgetMs: number): Deadline {
    PrimitivesGuard.instance.nonNegativeFinite('budgetMs', budgetMs);
    const proposed = this.clock.now().getTime() + budgetMs;
    return new Deadline(0, this.clock, Math.min(this.atMs, proposed));
  }

  /**
   * Returns the nearer of the two deadlines.
   * @param other Other deadline.
   * @returns The nearer one.
   */
  min(other: Deadline): Deadline {
    return other.atMs < this.atMs ? other : this;
  }

  /**
   * Runs `work` with a signal that aborts when the deadline expires or with `signal`.
   * Rejects with `DeadlineExceededError` on expiry, or with the reason of `signal`
   * if the caller aborts. The work may or may not have applied its effects, so
   * the caller treats those rejections as an uncertain result.
   * @param work Work that receives the signal.
   * @param signal Signal of the caller.
   * @returns What `work` returns.
   */
  async race<T>(
    work: (signal: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    this.assertCanStart(signal);
    const controller = new AbortController();
    const workSignal =
      signal === undefined
        ? controller.signal
        : AbortSignal.any([controller.signal, signal]);
    const running = Promise.resolve().then(() => work(workSignal));
    try {
      return await this.wait(running, signal);
    } catch (error) {
      controller.abort(error);
      throw error;
    }
  }

  /**
   * Awaits an already created promise with the deadline. If the deadline expires or `signal`
   * aborts first, rejects and the promise is abandoned.
   * An abandoned promise may reject later: its error has no owner.
   * @param promise Promise to await.
   * @param signal Signal of the caller.
   * @returns What the promise returns.
   */
  wait<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
    try {
      this.assertCanStart(signal);
    } catch (error) {
      promise.catch(() => undefined);
      return Promise.reject(error as Error);
    }
    return new Promise<T>((resolve, reject) => {
      const onAbort = (): void => {
        cleanup();
        reject(TimerScheduler.abortReason(signal as AbortSignal));
      };
      const cancelTimer = TimerScheduler.arm(this.remainingMs(), () => {
        cleanup();
        reject(new DeadlineExceededError(this.atMs));
      });
      const cleanup = (): void => {
        cancelTimer();
        signal?.removeEventListener('abort', onAbort);
      };
      signal?.addEventListener('abort', onAbort, { once: true });
      promise.then(
        (value) => {
          cleanup();
          resolve(value);
        },
        (error: unknown) => {
          cleanup();
          reject(error as Error);
        },
      );
    });
  }

  /**
   * Waits `ms` milliseconds; rejects if the deadline expires or `signal` aborts first.
   * @param ms Milliseconds to wait.
   * @param signal Signal of the caller.
   */
  sleep(ms: number, signal?: AbortSignal): Promise<void> {
    PrimitivesGuard.instance.nonNegativeFinite('ms', ms);
    return this.race(
      (inner) =>
        new Promise<void>((resolve, reject) => {
          const onAbort = (): void => {
            cancel();
            reject(TimerScheduler.abortReason(inner));
          };
          const cancel = TimerScheduler.arm(ms, () => {
            inner.removeEventListener('abort', onAbort);
            resolve();
          });
          inner.addEventListener('abort', onAbort, { once: true });
        }),
      signal,
    );
  }

  /**
   * Returns a signal that aborts with `DeadlineExceededError` when the remaining time
   * runs out. If it already expired, the signal is born aborted. The timer does not keep
   * the process alive.
   * @returns The signal.
   */
  toAbortSignal(): AbortSignal {
    const remaining = this.remainingMs();
    if (remaining === 0) {
      return AbortSignal.abort(new DeadlineExceededError(this.atMs));
    }
    const controller = new AbortController();
    TimerScheduler.armDetached(remaining, () =>
      controller.abort(new DeadlineExceededError(this.atMs)),
    );
    return controller.signal;
  }

  /**
   * Serializes the deadline as its epoch milliseconds.
   * @returns The instant.
   */
  toJSON(): number {
    return this.atMs;
  }

  private assertCanStart(signal?: AbortSignal): void {
    if (signal?.aborted === true) {
      throw TimerScheduler.abortReason(signal);
    }
    this.throwIfExpired();
  }
}
