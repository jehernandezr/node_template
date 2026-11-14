import { RandomSource } from '@platform/kernel';
import { Backoff } from './retry/backoff.js';
import { BackoffStrategy } from './retry/backoff-strategy.enum.js';
import { RetryPolicy } from './retry/retry-policy.js';

export { BackoffStrategy } from './retry/backoff-strategy.enum.js';

/** @deprecated Usa `RetryPolicy` y `Backoff`. */
export interface BackoffOptions {
  readonly strategy: BackoffStrategy;
  /** Espera del primer reintento, en milisegundos. */
  readonly baseMs: number;
  /** Tope de la espera, en milisegundos. Debe ser mayor o igual que `baseMs`. */
  readonly maxMs: number;
  /** Multiplicador entre intentos. Por defecto 2. */
  readonly factor?: number;
  /** Fuente aleatoria en `[0, 1)`. Por defecto `Math.random`. */
  readonly random?: () => number;
}

/** @deprecated Usa `Backoff.MAX_ATTEMPT`. */
export const MAX_BACKOFF_ATTEMPT = Backoff.MAX_ATTEMPT;

/** Adapta la función aleatoria de las opciones antiguas a `RandomSource`. */
class FunctionRandomSource extends RandomSource {
  constructor(private readonly source: () => number) {
    super();
  }

  next(): number {
    return this.source();
  }

  bytes(length: number): Uint8Array {
    return new Uint8Array(length);
  }
}

/** Funciones de compatibilidad sobre `RetryPolicy` y `Backoff`. */
class BackoffShim {
  static backoff(options: BackoffOptions): Backoff {
    const policy = new RetryPolicy(
      1,
      options.baseMs,
      options.maxMs,
      options.strategy,
      options.factor,
    );
    return new Backoff(
      policy,
      new FunctionRandomSource(options.random ?? Math.random),
    );
  }

  static validate(options: BackoffOptions): void {
    BackoffShim.backoff(options);
  }

  static delay(attempt: number, options: BackoffOptions): number {
    return BackoffShim.backoff(options).delay(attempt);
  }

  static create(options: BackoffOptions): (attempt: number) => number {
    const backoff = BackoffShim.backoff(options);
    return (attempt) => backoff.delay(attempt);
  }
}

/** @deprecated Usa `new RetryPolicy(...)`, que valida al construirse. */
export const validateBackoffOptions = BackoffShim.validate;

/** @deprecated Usa `Backoff.delay`. */
export const backoffDelay = BackoffShim.delay;

/** @deprecated Usa `Backoff`. */
export const createBackoff = BackoffShim.create;
