import type { RateLimitResult, RateLimitRule } from './rate-limit-rule.js';

/*
 * Ventana deslizante aproximada con dos ventanas fijas: lo contado en la
 * ventana anterior pesa en proporción a la parte de ella que todavía cae
 * dentro de la ventana deslizante.
 *
 *   estimado = anterior * (W - transcurrido) / W + actual
 *
 * Las cuentas se hacen multiplicadas por W para trabajar solo con enteros.
 * Con los topes de la regla (límite de 10^6 y ventana de 30 días) todos los
 * productos quedan por debajo de 2^53, así que la decisión es exacta aquí y
 * en el script Lua de Valkey, que la repite.
 */

/** Ventana fija en la que cae un instante. */
export interface WindowPosition {
  /** Número de la ventana fija: `floor(ahora / W)`. */
  readonly index: number;
  /** Milisegundos transcurridos desde el inicio de la ventana, en `[0, W)`. */
  readonly elapsedMs: number;
}

/** Unidades contadas en la ventana fija anterior y en la actual. */
export interface WindowCounts {
  readonly previous: number;
  readonly current: number;
}

/** Ventana fija en la que cae `nowMs`, con milisegundos epoch enteros. */
export function windowPosition(
  nowMs: number,
  windowMs: number,
): WindowPosition {
  const index = Math.floor(nowMs / windowMs);
  return { index, elapsedMs: nowMs - index * windowMs };
}

/** Parte entera de `a / b` para enteros no negativos, sin error de redondeo. */
function floorDiv(a: number, b: number): number {
  let quotient = Math.floor(a / b);
  if (quotient * b > a) {
    quotient -= 1;
  } else if ((quotient + 1) * b <= a) {
    quotient += 1;
  }
  return quotient;
}

function ceilDiv(a: number, b: number): number {
  const quotient = floorDiv(a, b);
  return quotient * b === a ? quotient : quotient + 1;
}

/** Estimado de la ventana deslizante multiplicado por W. */
function scaledEstimate(
  counts: WindowCounts,
  position: WindowPosition,
  windowMs: number,
): number {
  return (
    counts.previous * (windowMs - position.elapsedMs) +
    counts.current * windowMs
  );
}

/** Si `cost` unidades más caben en el límite de la regla. */
export function admits(
  counts: WindowCounts,
  position: WindowPosition,
  rule: RateLimitRule,
  cost: number,
): boolean {
  return (
    scaledEstimate(counts, position, rule.windowMs) + cost * rule.windowMs <=
    rule.limit * rule.windowMs
  );
}

/**
 * Espera mínima para que `cost` unidades quepan si no llega más tráfico.
 * Solo tiene sentido cuando hoy no caben.
 */
function waitMs(
  counts: WindowCounts,
  position: WindowPosition,
  rule: RateLimitRule,
  cost: number,
): number {
  const windowMs = rule.windowMs;
  const room = rule.limit - cost - counts.current;
  if (room >= 0) {
    // Cabe en esta misma ventana cuando la anterior pese lo suficiente menos.
    return (
      windowMs - floorDiv(room * windowMs, counts.previous) - position.elapsedMs
    );
  }
  // Hay que esperar a la ventana siguiente, donde la actual pasa a ser la anterior.
  return (
    windowMs -
    position.elapsedMs +
    windowMs -
    floorDiv((rule.limit - cost) * windowMs, counts.current)
  );
}

/**
 * Respuesta para las cuentas de un instante.
 * @param counts Cuentas después de contar, si la operación se aceptó.
 * @param cost Costo con el que se calcula la espera si se rechazó.
 */
export function slidingWindowResult(
  counts: WindowCounts,
  position: WindowPosition,
  rule: RateLimitRule,
  allowed: boolean,
  cost: number,
): RateLimitResult {
  const count = ceilDiv(
    scaledEstimate(counts, position, rule.windowMs),
    rule.windowMs,
  );
  return {
    allowed,
    count,
    remaining: Math.max(0, rule.limit - count),
    retryAfterMs: allowed ? 0 : waitMs(counts, position, rule, cost),
  };
}
