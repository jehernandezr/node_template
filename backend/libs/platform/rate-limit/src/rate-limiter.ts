import type { RateLimitResult, RateLimitRule } from './rate-limit-rule.js';

/**
 * Puerto de límite de tasa por llave con ventana deslizante. Las
 * implementaciones validan con `assertRateLimitCall` y lanzan
 * `InvalidArgumentError` antes de contar nada.
 */
export abstract class RateLimiter {
  /**
   * Cuenta `cost` unidades si caben en el límite. Una operación rechazada no
   * cuenta, así que insistir no alarga la espera.
   * @param cost Unidades de la operación, de 1 a `rule.limit`. Por defecto 1.
   */
  abstract consume(
    key: string,
    rule: RateLimitRule,
    cost?: number,
  ): Promise<RateLimitResult>;

  /** Lo que respondería `consume` con costo 1, sin contar. */
  abstract peek(key: string, rule: RateLimitRule): Promise<RateLimitResult>;

  /** Borra lo contado para la llave en esa regla. */
  abstract reset(key: string, rule: RateLimitRule): Promise<void>;
}
