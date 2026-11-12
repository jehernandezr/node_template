import { InvalidArgumentError } from './errors.js';

/**
 * Cómo se reparte la espera dentro del techo exponencial
 * `min(maxMs, baseMs * factor^(attempt - 1))`.
 * - `None`: espera exactamente el techo (exponencial sin jitter).
 * - `FullJitter`: espera uniforme en `[0, techo)`.
 * - `EqualJitter`: espera uniforme en `[techo / 2, techo)`.
 */
export enum BackoffStrategy {
  None = 'none',
  FullJitter = 'full-jitter',
  EqualJitter = 'equal-jitter',
}

export interface BackoffOptions {
  readonly strategy: BackoffStrategy;
  /** Espera del primer reintento, en milisegundos. */
  readonly baseMs: number;
  /** Tope de la espera, en milisegundos. Debe ser mayor o igual que `baseMs`. */
  readonly maxMs: number;
  /** Multiplicador entre intentos. Por defecto 2. */
  readonly factor?: number;
  /** Fuente aleatoria en `[0, 1)`. Por defecto `Math.random`; inyectarla hace la espera determinista. */
  readonly random?: () => number;
}

/** Número máximo de intento aceptado; evita bucles de reintento sin fin por error. */
export const MAX_BACKOFF_ATTEMPT = 1_000;

function assertNonNegativeFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new InvalidArgumentError(name, 'a finite number >= 0');
  }
}

/** Valida las opciones una vez, para fallar al configurar y no al reintentar. */
export function validateBackoffOptions(options: BackoffOptions): void {
  if (!Object.values(BackoffStrategy).includes(options.strategy)) {
    throw new InvalidArgumentError('strategy', 'a BackoffStrategy value');
  }
  assertNonNegativeFinite('baseMs', options.baseMs);
  assertNonNegativeFinite('maxMs', options.maxMs);
  if (options.maxMs < options.baseMs) {
    throw new InvalidArgumentError('maxMs', 'greater than or equal to baseMs');
  }
  const factor = options.factor ?? 2;
  if (!Number.isFinite(factor) || factor < 1) {
    throw new InvalidArgumentError('factor', 'a finite number >= 1');
  }
}

/** Valor aleatorio acotado a `[0, 1)`, aunque la fuente inyectada se salga del rango. */
function boundedRandom(random: () => number): number {
  const value = random();
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return value >= 1 ? 1 - Number.EPSILON : value;
}

/**
 * Espera antes del reintento número `attempt` (el primero es 1), en milisegundos enteros.
 * Nunca supera `maxMs` y nunca es negativa.
 */
export function backoffDelay(attempt: number, options: BackoffOptions): number {
  validateBackoffOptions(options);
  if (
    !Number.isInteger(attempt) ||
    attempt < 1 ||
    attempt > MAX_BACKOFF_ATTEMPT
  ) {
    throw new InvalidArgumentError(
      'attempt',
      `an integer between 1 and ${MAX_BACKOFF_ATTEMPT}`,
    );
  }
  const factor = options.factor ?? 2;
  const exponential = options.baseMs * factor ** (attempt - 1);
  // `baseMs = 0` da 0; un exponente enorme da Infinity y lo corta `maxMs`.
  const ceiling = Math.min(
    options.maxMs,
    Number.isNaN(exponential) ? 0 : exponential,
  );
  const random = options.random ?? Math.random;

  switch (options.strategy) {
    case BackoffStrategy.None:
      return Math.floor(ceiling);
    case BackoffStrategy.FullJitter:
      return Math.floor(ceiling * boundedRandom(random));
    case BackoffStrategy.EqualJitter: {
      const half = ceiling / 2;
      return Math.floor(half + half * boundedRandom(random));
    }
  }
}

/** Crea una función `attempt => espera` con las opciones ya validadas. */
export function createBackoff(
  options: BackoffOptions,
): (attempt: number) => number {
  validateBackoffOptions(options);
  return (attempt) => backoffDelay(attempt, options);
}
