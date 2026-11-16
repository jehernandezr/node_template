import type { RandomSource } from '@platform/kernel';
import { PrimitivesGuard } from '../errors/primitives-guard.js';
import { BackoffStrategy } from './backoff-strategy.enum.js';
import type { RetryPolicy } from './retry-policy.js';

/** Calcula la espera antes de cada reintento según una `RetryPolicy`. */
export class Backoff {
  /** Número máximo de intento aceptado; evita bucles de reintento sin fin por error. */
  static readonly MAX_ATTEMPT = 1_000;

  constructor(
    readonly policy: RetryPolicy,
    private readonly random: RandomSource,
  ) {}

  /**
   * Espera, en milisegundos enteros, antes del reintento número `attempt` (el
   * primero es 1). Nunca supera `policy.maxMs` y nunca es negativa.
   */
  delay(attempt: number): number {
    PrimitivesGuard.instance.integerInRange(
      'attempt',
      attempt,
      1,
      Backoff.MAX_ATTEMPT,
    );
    const { baseMs, maxMs, factor, strategy } = this.policy;
    const exponential = baseMs * factor ** (attempt - 1);
    // `baseMs = 0` da 0; un exponente enorme da Infinity y lo corta `maxMs`.
    const ceiling = Math.min(
      maxMs,
      Number.isNaN(exponential) ? 0 : exponential,
    );

    switch (strategy) {
      case BackoffStrategy.None:
        return Math.floor(ceiling);
      case BackoffStrategy.FullJitter:
        return Math.floor(ceiling * this.unit());
      case BackoffStrategy.EqualJitter: {
        const half = ceiling / 2;
        return Math.floor(half + half * this.unit());
      }
    }
  }

  /** Valor aleatorio acotado a `[0, 1)`, aunque la fuente inyectada se salga del rango. */
  private unit(): number {
    const value = this.random.next();
    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }
    return value >= 1 ? 1 - Number.EPSILON : value;
  }
}
