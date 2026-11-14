import { RateLimitArgumentGuard } from './errors/rate-limit-argument-guard.js';
import { RateLimitLimits } from './rate-limit-limits.js';

/**
 * Límite de `limit` unidades por ventana deslizante de `windowMs`. El nombre y
 * la ventana identifican los contadores: cambiar el límite de una regla
 * conserva lo contado, cambiar la ventana empieza de cero.
 *
 * Solo tiene campos de lectura, así que un objeto literal con la misma forma
 * también es una regla; por eso la validación es estática y no un método de
 * instancia, y los limitadores validan cada regla que reciben.
 */
export class RateLimitRule {
  private constructor(
    readonly name: string,
    readonly limit: number,
    readonly windowMs: number,
  ) {}

  /**
   * Valida y congela una regla. Pensado para declararlas como constantes al
   * cargar el módulo, de modo que una regla mal escrita falle al arrancar.
   * @throws InvalidArgumentError como {@link RateLimitRule.validate}.
   */
  static define(rule: RateLimitRule): RateLimitRule {
    RateLimitRule.validate(rule);
    return Object.freeze(
      new RateLimitRule(rule.name, rule.limit, rule.windowMs),
    );
  }

  /**
   * @throws InvalidArgumentError si el nombre no cumple
   *   `RateLimitLimits.RULE_NAME_PATTERN` o el límite o la ventana no son
   *   enteros dentro de su rango.
   */
  static validate(rule: RateLimitRule): void {
    const guard = RateLimitArgumentGuard.instance;
    guard.matches('rule.name', rule.name, RateLimitLimits.RULE_NAME_PATTERN);
    guard.integerInRange(
      'rule.limit',
      rule.limit,
      1,
      RateLimitLimits.MAX_LIMIT,
    );
    guard.integerInRange(
      'rule.windowMs',
      rule.windowMs,
      1,
      RateLimitLimits.MAX_WINDOW_MS,
    );
  }
}
