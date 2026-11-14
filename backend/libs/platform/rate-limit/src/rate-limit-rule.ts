import { InvalidArgumentError } from '@platform/primitives';

/**
 * Forma del nombre de una regla. Sin `:` ni llaves, porque el nombre entra en
 * las llaves de Valkey y en su hash tag.
 */
export const RATE_LIMIT_RULE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/** Mayor límite que acepta una regla. */
export const RATE_LIMIT_MAX_LIMIT = 1_000_000;

/** Mayor ventana que acepta una regla: 30 días. */
export const RATE_LIMIT_MAX_WINDOW_MS = 30 * 24 * 60 * 60 * 1_000;

/** Mayor longitud, en caracteres, de la llave que se limita. */
export const RATE_LIMIT_MAX_KEY_LENGTH = 512;

/**
 * Límite de `limit` unidades por ventana deslizante de `windowMs`. El nombre y
 * la ventana identifican los contadores: cambiar el límite de una regla
 * conserva lo contado, cambiar la ventana empieza de cero.
 */
export interface RateLimitRule {
  readonly name: string;
  readonly limit: number;
  readonly windowMs: number;
}

/** Respuesta de un limitador. */
export interface RateLimitResult {
  /** Si la operación cabe en el límite. */
  readonly allowed: boolean;
  /** Unidades estimadas en la ventana deslizante, redondeadas hacia arriba. */
  readonly count: number;
  /** Unidades que todavía caben, `limit - count` y nunca negativo. */
  readonly remaining: number;
  /**
   * Espera hasta que la operación cabría si no llega más tráfico, en
   * milisegundos. Es 0 cuando `allowed` es verdadero.
   */
  readonly retryAfterMs: number;
}

/** Operaciones de un {@link RateLimiter}. */
export enum RateLimitOperation {
  Consume = 'consume',
  Peek = 'peek',
  Reset = 'reset',
}

function isIntegerIn(value: number, min: number, max: number): boolean {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

/**
 * Valida una regla.
 * @throws InvalidArgumentError si el nombre no cumple
 *   {@link RATE_LIMIT_RULE_NAME_PATTERN} o el límite o la ventana no son
 *   enteros dentro de su rango.
 */
export function assertRateLimitRule(rule: RateLimitRule): void {
  if (
    typeof rule.name !== 'string' ||
    !RATE_LIMIT_RULE_NAME_PATTERN.test(rule.name)
  ) {
    throw new InvalidArgumentError(
      'rule.name',
      '1 to 64 characters in [A-Za-z0-9._-], starting with a letter or digit',
    );
  }
  if (!isIntegerIn(rule.limit, 1, RATE_LIMIT_MAX_LIMIT)) {
    throw new InvalidArgumentError(
      'rule.limit',
      `an integer between 1 and ${RATE_LIMIT_MAX_LIMIT}`,
    );
  }
  if (!isIntegerIn(rule.windowMs, 1, RATE_LIMIT_MAX_WINDOW_MS)) {
    throw new InvalidArgumentError(
      'rule.windowMs',
      `an integer between 1 and ${RATE_LIMIT_MAX_WINDOW_MS}`,
    );
  }
}

/**
 * Valida la llave, la regla y el costo de una llamada. El costo va de 1 al
 * límite: uno mayor nunca cabría y delata un error de programación.
 * @throws InvalidArgumentError con el primer argumento inválido.
 */
export function assertRateLimitCall(
  key: string,
  rule: RateLimitRule,
  cost = 1,
): void {
  if (
    typeof key !== 'string' ||
    key.length === 0 ||
    key.length > RATE_LIMIT_MAX_KEY_LENGTH
  ) {
    throw new InvalidArgumentError(
      'key',
      `a string of 1 to ${RATE_LIMIT_MAX_KEY_LENGTH} characters`,
    );
  }
  assertRateLimitRule(rule);
  if (!isIntegerIn(cost, 1, rule.limit)) {
    throw new InvalidArgumentError(
      'cost',
      'an integer between 1 and the limit of the rule',
    );
  }
}

/**
 * Valida y congela una regla. Pensado para declararlas como constantes al
 * cargar el módulo, de modo que una regla mal escrita falle al arrancar.
 * @throws InvalidArgumentError como {@link assertRateLimitRule}.
 */
export function defineRateLimitRule(rule: RateLimitRule): RateLimitRule {
  assertRateLimitRule(rule);
  return Object.freeze({
    name: rule.name,
    limit: rule.limit,
    windowMs: rule.windowMs,
  });
}
