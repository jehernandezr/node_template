import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import { RateLimitCallValidator } from '../rate-limit-call-validator.js';
import { RateLimitRule } from '../rate-limit-rule.js';
import { RATE_LIMIT_METADATA } from './rate-limit-tokens.js';
import { RateLimitKey } from './rate-limit-key.enum.js';

/** Metadata que guarda el decorador en cada ruta. */
export interface RateLimitMetadata {
  readonly rule: RateLimitRule;
  readonly cost: number;
}

/** Escribe la regla de una ruta. Valida al cargar la clase, no en la petición. */
export class RateLimitMetadataWriter {
  /**
   * @throws InvalidArgumentError si la regla o el costo no son válidos.
   */
  static decorate(
    rule: RateLimitRule,
    options: { readonly cost?: number } = {},
  ): CustomDecorator<symbol> {
    const frozen = RateLimitRule.define(rule);
    const cost = options.cost ?? 1;
    RateLimitCallValidator.validate(RateLimitKey.Anonymous, frozen, cost);
    return SetMetadata<symbol, RateLimitMetadata>(RATE_LIMIT_METADATA, {
      rule: frozen,
      cost,
    });
  }
}

/** Decorador `@RateLimit(rule)` para las rutas. */
export const RateLimit = RateLimitMetadataWriter.decorate;
