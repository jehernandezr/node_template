import { InvalidArgumentError } from '../errors/invalid-argument.error.js';
import { PrimitivesGuard } from '../errors/primitives-guard.js';
import { BackoffStrategy } from './backoff-strategy.enum.js';

/**
 * Política de reintento única de la plataforma: cuántos intentos y cómo crece
 * la espera entre ellos. Internal-api, messaging y resilience la reutilizan en
 * lugar de declarar la suya. Valida al construirse.
 */
export class RetryPolicy {
  /** Un solo intento, sin reintentos. */
  static readonly none = new RetryPolicy(1, 0, 0, BackoffStrategy.None);

  /**
   * @param maxAttempts Intentos totales, el primero incluido. Entero positivo.
   * @param baseMs Espera del primer reintento. Finito y no negativo.
   * @param maxMs Tope de la espera. Mayor o igual que `baseMs`.
   * @param strategy Cómo se reparte la espera dentro del techo.
   * @param factor Multiplicador entre intentos. Finito y mayor o igual que 1.
   */
  constructor(
    readonly maxAttempts: number,
    readonly baseMs: number,
    readonly maxMs: number,
    readonly strategy: BackoffStrategy,
    readonly factor = 2,
  ) {
    const guard = PrimitivesGuard.instance;
    guard.positiveInteger('maxAttempts', maxAttempts);
    if (!Object.values(BackoffStrategy).includes(strategy)) {
      throw new InvalidArgumentError('strategy', 'a BackoffStrategy value');
    }
    guard.nonNegativeFinite('baseMs', baseMs);
    guard.nonNegativeFinite('maxMs', maxMs);
    if (maxMs < baseMs) {
      throw new InvalidArgumentError(
        'maxMs',
        'greater than or equal to baseMs',
      );
    }
    if (!Number.isFinite(factor) || factor < 1) {
      throw new InvalidArgumentError('factor', 'a finite number >= 1');
    }
  }
}
