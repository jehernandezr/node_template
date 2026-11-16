import { ResilienceError } from './resilience-error.js';
import { ResilienceErrorCode } from './resilience-error-code.enum.js';

/** La configuración de una política no cumple sus reglas. Es un error de arranque. */
export class InvalidPolicyError extends ResilienceError {
  constructor(message: string) {
    super(ResilienceErrorCode.InvalidPolicy, message);
  }
}
