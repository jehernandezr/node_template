import type { Clock } from '@platform/kernel';
import { DeadlineExceededError, InvalidArgumentError } from './errors.js';

const MAX_TIMER_MS = 2_147_483_647;

function assertBudget(budgetMs: number): void {
  if (!Number.isFinite(budgetMs) || budgetMs < 0) {
    throw new InvalidArgumentError('budgetMs', 'a finite number >= 0');
  }
}

/**
 * Instante límite de una operación, en milisegundos epoch absolutos. Al ser
 * absoluto viaja entre procesos sin acumular error, y un hijo nunca excede al
 * padre. El tiempo se lee del `Clock` del kernel.
 */
export class Deadline {
  private constructor(
    /** Instante límite en milisegundos epoch. */
    readonly atMs: number,
    private readonly clock: Clock,
  ) {}

  /** Límite en un instante absoluto (milisegundos epoch). */
  static at(atMs: number, clock: Clock): Deadline {
    if (!Number.isFinite(atMs)) {
      throw new InvalidArgumentError('atMs', 'a finite epoch in milliseconds');
    }
    return new Deadline(atMs, clock);
  }

  /** Límite a `budgetMs` milisegundos desde ahora. */
  static after(budgetMs: number, clock: Clock): Deadline {
    assertBudget(budgetMs);
    return new Deadline(clock.now().getTime() + budgetMs, clock);
  }

  /** Milisegundos que quedan; 0 si ya venció. */
  remaining(): number {
    return Math.max(0, this.atMs - this.clock.now().getTime());
  }

  /** Indica si el límite ya pasó. */
  isExpired(): boolean {
    return this.remaining() === 0;
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
    assertBudget(budgetMs);
    const proposed = this.clock.now().getTime() + budgetMs;
    return new Deadline(Math.min(this.atMs, proposed), this.clock);
  }

  /** El más cercano de los dos límites. */
  min(other: Deadline): Deadline {
    return other.atMs < this.atMs ? other : this;
  }

  /**
   * Señal que aborta con `DeadlineExceededError` cuando se agota el tiempo que
   * queda. Si ya venció, la señal nace abortada. El temporizador no mantiene
   * vivo el proceso. El tiempo restante se calcula con el `Clock` al crear la
   * señal; la espera corre con temporizadores reales.
   */
  toAbortSignal(): AbortSignal {
    const remaining = this.remaining();
    if (remaining === 0) {
      return AbortSignal.abort(new DeadlineExceededError(this.atMs));
    }
    const controller = new AbortController();
    // setTimeout acepta como máximo 2^31 - 1 ms; un plazo mayor se arma por tramos.
    const arm = (ms: number): void => {
      const chunk = Math.min(ms, MAX_TIMER_MS);
      const timer = setTimeout(() => {
        if (ms > chunk) {
          arm(ms - chunk);
        } else {
          controller.abort(new DeadlineExceededError(this.atMs));
        }
      }, chunk);
      timer.unref();
    };
    arm(remaining);
    return controller.signal;
  }

  toJSON(): number {
    return this.atMs;
  }
}
