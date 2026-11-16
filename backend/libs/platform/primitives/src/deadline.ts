import type { Clock } from '@platform/kernel';
import { DeadlineExceededError } from './errors/deadline-exceeded.error.js';
import { InvalidArgumentError } from './errors/invalid-argument.error.js';
import { PrimitivesGuard } from './errors/primitives-guard.js';
import { TimerScheduler } from './waiting/timer-scheduler.js';

/**
 * Instante límite de una operación, en milisegundos epoch absolutos. Al ser
 * absoluto viaja entre procesos sin acumular error, y un hijo nunca excede al
 * padre. El tiempo se lee del `Clock` del kernel.
 */
export class Deadline {
  /** Instante límite en milisegundos epoch. */
  readonly atMs: number;

  /**
   * @param budgetMs Milisegundos desde ahora hasta el límite. Finito y no negativo.
   * @param clock Fuente de tiempo.
   * @param atMs Instante absoluto que sustituye al presupuesto; lo usan `at`, `child` y `min`.
   */
  constructor(
    budgetMs: number,
    private readonly clock: Clock,
    atMs?: number,
  ) {
    PrimitivesGuard.instance.nonNegativeFinite('budgetMs', budgetMs);
    this.atMs = atMs ?? clock.now().getTime() + budgetMs;
  }

  /** Límite en un instante absoluto (milisegundos epoch). */
  static at(atMs: number, clock: Clock): Deadline {
    if (!Number.isFinite(atMs)) {
      throw new InvalidArgumentError('atMs', 'a finite epoch in milliseconds');
    }
    return new Deadline(0, clock, atMs);
  }

  /** Límite a `budgetMs` milisegundos desde ahora. */
  static after(budgetMs: number, clock: Clock): Deadline {
    return new Deadline(budgetMs, clock);
  }

  /** Milisegundos que quedan; 0 si ya venció. */
  remainingMs(): number {
    return Math.max(0, this.atMs - this.clock.now().getTime());
  }

  /** Indica si el límite ya pasó. */
  isExpired(): boolean {
    return this.remainingMs() === 0;
  }

  /** Lanza `DeadlineExceededError` si el límite ya pasó. */
  throwIfExpired(): void {
    if (this.isExpired()) {
      throw new DeadlineExceededError(this.atMs);
    }
  }

  /**
   * Límite para una sub-operación: `budgetMs` desde ahora, recortado al límite
   * propio. Sirve para reservar tiempo (por ejemplo, para compensar) dentro del
   * presupuesto del padre.
   */
  child(budgetMs: number): Deadline {
    PrimitivesGuard.instance.nonNegativeFinite('budgetMs', budgetMs);
    const proposed = this.clock.now().getTime() + budgetMs;
    return new Deadline(0, this.clock, Math.min(this.atMs, proposed));
  }

  /** El más cercano de los dos límites. */
  min(other: Deadline): Deadline {
    return other.atMs < this.atMs ? other : this;
  }

  /**
   * Corre `work` con una señal que aborta al vencer el plazo o con `signal`.
   * Rechaza con `DeadlineExceededError` al vencer, o con el motivo de `signal`
   * si aborta quien llama. El trabajo pudo o no aplicar sus efectos, así que
   * quien llama trata esos rechazos como resultado incierto.
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
   * Espera una promesa ya creada con el plazo. Si el plazo vence o `signal`
   * aborta primero, rechaza y la promesa queda abandonada.
   */
  wait<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
    try {
      this.assertCanStart(signal);
    } catch (error) {
      // Una promesa abandonada puede rechazar después: su error no tiene dueño.
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

  /** Espera `ms` milisegundos; rechaza si antes vence el plazo o aborta `signal`. */
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
   * Señal que aborta con `DeadlineExceededError` cuando se agota el tiempo que
   * queda. Si ya venció, la señal nace abortada. El temporizador no mantiene
   * vivo el proceso.
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
