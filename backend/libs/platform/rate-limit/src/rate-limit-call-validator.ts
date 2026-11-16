import { InvalidArgumentError } from '@platform/primitives';
import { RateLimitArgumentGuard } from './errors/rate-limit-argument-guard.js';
import { RateLimitLimits } from './rate-limit-limits.js';
import { RateLimitRule } from './rate-limit-rule.js';

/** Valida una llamada a un `RateLimiter` antes de contar nada. */
export class RateLimitCallValidator {
  /**
   * Valida la llave, la regla y el costo. El costo va de 1 al límite: uno
   * mayor nunca cabría y delata un error de programación.
   * @throws InvalidArgumentError con el primer argumento inválido.
   */
  static validate(key: string, rule: RateLimitRule, cost = 1): void {
    if (
      typeof key !== 'string' ||
      key.length === 0 ||
      key.length > RateLimitLimits.MAX_KEY_LENGTH
    ) {
      throw new InvalidArgumentError(
        'key',
        `a string of 1 to ${RateLimitLimits.MAX_KEY_LENGTH} characters`,
      );
    }
    RateLimitRule.validate(rule);
    RateLimitArgumentGuard.instance.integerInRange('cost', cost, 1, rule.limit);
  }
}
